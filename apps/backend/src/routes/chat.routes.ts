import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireCircleMember } from '../middleware/circleAuth';
import { editMessageSchema } from '@skillshare-circles/shared';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router({ mergeParams: true });

const MESSAGE_SELECT = {
  id: true,
  content: true,
  circleId: true,
  authorId: true,
  type: true,
  fileUrl: true,
  fileName: true,
  isEdited: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
};

router.get(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const before = req.query['before'] as string | undefined;
      const skip = (page - 1) * limit;

      const where = {
        circleId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      };

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          select: MESSAGE_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.message.count({ where }),
      ]);

      return sendPaginated(res, messages.reverse(), total, page, limit);
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  '/:messageId',
  authenticate,
  requireCircleMember as Parameters<typeof router.patch>[1],
  validate(editMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messageId = req.params['messageId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;
      const { content } = req.body as { content: string };

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { authorId: true },
      });

      if (!message) throw new NotFoundError('Message');
      if (message.authorId !== userId) throw new ForbiddenError('Cannot edit another user message');

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, isEdited: true },
        select: MESSAGE_SELECT,
      });

      return sendSuccess(res, updated);
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:messageId',
  authenticate,
  requireCircleMember as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messageId = req.params['messageId'] as string;
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { authorId: true },
      });

      if (!message) throw new NotFoundError('Message');

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      const canDelete =
        message.authorId === userId || ['ADMIN', 'MODERATOR'].includes(member?.role ?? '');
      if (!canDelete) throw new ForbiddenError('Cannot delete this message');

      await prisma.message.delete({ where: { id: messageId } });

      return sendSuccess(res, null, 200, 'Message deleted');
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
