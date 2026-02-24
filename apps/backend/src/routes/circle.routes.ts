import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  requireCircleMember,
  requireCircleModerator,
  requireCircleAdmin,
} from '../middleware/circleAuth';
import {
  createCircleSchema,
  updateCircleSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '@skillshare-circles/shared';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../utils/errors';
import { awardXp } from '../services/gamification.service';
import { sendEmail, getCircleInviteEmailHtml } from '../config/email';
import { env } from '../config/env';

const router = Router();

const CIRCLE_SELECT = {
  id: true,
  name: true,
  description: true,
  subject: true,
  isPrivate: true,
  maxMembers: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  _count: { select: { members: true } },
};

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 12;
    const search = req.query['search'] as string | undefined;
    const subject = req.query['subject'] as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      isPrivate: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { subject: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(subject && { subject: { contains: subject, mode: 'insensitive' as const } }),
    };

    const [circles, total] = await Promise.all([
      prisma.circle.findMany({
        where,
        select: CIRCLE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.circle.count({ where }),
    ]);

    return sendPaginated(res, circles, total, page, limit);
  } catch (error) {
    return next(error);
  }
});

router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          select: {
            ...CIRCLE_SELECT,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { content: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return sendSuccess(
      res,
      memberships.map((m: (typeof memberships)[0]) => ({
        ...m.circle,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/',
  authenticate,
  validate(createCircleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const { name, description, subject, isPrivate, maxMembers } = req.body as {
        name: string;
        description: string;
        subject: string;
        isPrivate?: boolean;
        maxMembers?: number;
      };

      const circle = await prisma.circle.create({
        data: {
          name,
          description,
          subject,
          isPrivate: isPrivate ?? false,
          maxMembers: maxMembers ?? 20,
          creatorId: userId,
          members: { create: { userId, role: 'ADMIN' } },
        },
        select: CIRCLE_SELECT,
      });

      await awardXp(userId, 'CREATE_CIRCLE');

      return sendSuccess(res, circle, 201);
    } catch (error) {
      return next(error);
    }
  },
);

router.get('/:circleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const circleId = req.params['circleId'] as string;
    const userId = (req as AuthenticatedRequest).user.userId;

    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      select: {
        ...CIRCLE_SELECT,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                level: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!circle) throw new NotFoundError('Circle');

    const isMember = circle.members.some((m: { userId: string }) => m.userId === userId);
    if (circle.isPrivate && !isMember) {
      throw new ForbiddenError('This circle is private');
    }

    return sendSuccess(res, { ...circle, isMember });
  } catch (error) {
    return next(error);
  }
});

router.patch(
  '/:circleId',
  authenticate,
  requireCircleAdmin as Parameters<typeof router.patch>[1],
  validate(updateCircleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const data = req.body as Record<string, unknown>;

      const circle = await prisma.circle.update({
        where: { id: circleId },
        data,
        select: CIRCLE_SELECT,
      });

      return sendSuccess(res, circle);
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:circleId',
  authenticate,
  requireCircleAdmin as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      if (!circle) throw new NotFoundError('Circle');
      if (circle.creatorId !== userId) throw new ForbiddenError('Only the creator can delete a circle');

      await prisma.circle.delete({ where: { id: circleId } });

      return sendSuccess(res, null, 200, 'Circle deleted');
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/:circleId/join',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;
      const { inviteCode } = req.body as { inviteCode?: string };

      const circle = await prisma.circle.findUnique({
        where: { id: circleId },
        include: { _count: { select: { members: true } } },
      });

      if (!circle) throw new NotFoundError('Circle');

      const existingMember = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
      });
      if (existingMember) throw new ConflictError('Already a member of this circle');

      if (circle._count.members >= circle.maxMembers) {
        throw new ForbiddenError('Circle is at maximum capacity');
      }

      if (circle.isPrivate) {
        if (!inviteCode || inviteCode !== circle.inviteCode) {
          const invite = await prisma.circleInvite.findFirst({
            where: {
              circleId,
              receiverId: userId,
              status: 'PENDING',
              expiresAt: { gt: new Date() },
            },
          });
          if (!invite) throw new ForbiddenError('Valid invite required to join private circle');
          await prisma.circleInvite.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED' },
          });
        }
      }

      await prisma.circleMember.create({ data: { userId, circleId, role: 'MEMBER' } });
      await awardXp(userId, 'JOIN_CIRCLE');

      return sendSuccess(res, null, 200, 'Joined circle successfully');
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/:circleId/leave',
  authenticate,
  requireCircleMember as Parameters<typeof router.post>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      if (circle?.creatorId === userId) {
        throw new ForbiddenError('Circle creator cannot leave. Transfer ownership or delete the circle.');
      }

      await prisma.circleMember.delete({ where: { userId_circleId: { userId, circleId } } });

      return sendSuccess(res, null, 200, 'Left circle successfully');
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/:circleId/invite',
  authenticate,
  requireCircleModerator as Parameters<typeof router.post>[1],
  validate(inviteMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const senderId = (req as AuthenticatedRequest).user.userId;
      const { email } = req.body as { email: string };

      const receiver = await prisma.user.findUnique({ where: { email } });
      if (!receiver) throw new NotFoundError('User with that email');

      const isMember = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId: receiver.id, circleId } },
      });
      if (isMember) throw new ConflictError('User is already a member');

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      if (!circle) throw new NotFoundError('Circle');

      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { displayName: true },
      });

      await prisma.circleInvite.upsert({
        where: { circleId_receiverId: { circleId, receiverId: receiver.id } },
        update: { status: 'PENDING', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        create: {
          circleId,
          senderId,
          receiverId: receiver.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const inviteUrl = `${env.FRONTEND_URL}/circles/${circleId}?inviteCode=${circle.inviteCode}`;
      await sendEmail({
        to: email,
        subject: `You've been invited to join "${circle.name}" on Skillshare Circles`,
        html: getCircleInviteEmailHtml(sender?.displayName ?? 'A user', circle.name, inviteUrl),
      }).catch(() => {});

      await prisma.notification.create({
        data: {
          userId: receiver.id,
          type: 'CIRCLE_INVITE',
          title: 'Circle Invitation',
          message: `${sender?.displayName} invited you to join "${circle.name}"`,
          link: `/circles/${circleId}`,
        },
      });

      return sendSuccess(res, null, 200, 'Invitation sent');
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  '/:circleId/members/:userId/role',
  authenticate,
  requireCircleAdmin as Parameters<typeof router.patch>[1],
  validate(updateMemberRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = req.params['userId'] as string;
      const requesterId = (req as AuthenticatedRequest).user.userId;
      const { role } = req.body as { role: 'ADMIN' | 'MODERATOR' | 'MEMBER' };

      if (userId === requesterId) throw new ForbiddenError('Cannot change your own role');

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      if (userId === circle?.creatorId) throw new ForbiddenError('Cannot change the circle creator role');

      const member = await prisma.circleMember.update({
        where: { userId_circleId: { userId, circleId } },
        data: { role },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      return sendSuccess(res, member);
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:circleId/members/:userId',
  authenticate,
  requireCircleModerator as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = req.params['userId'] as string;
      const requesterId = (req as AuthenticatedRequest).user.userId;

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      if (userId === circle?.creatorId) throw new ForbiddenError('Cannot remove the circle creator');
      if (userId === requesterId) throw new ValidationError('Use leave endpoint to leave a circle');

      await prisma.circleMember.delete({ where: { userId_circleId: { userId, circleId } } });

      return sendSuccess(res, null, 200, 'Member removed');
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
