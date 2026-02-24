import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireCircleMember } from '../middleware/circleAuth';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router({ mergeParams: true });

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  startTime: z.string().datetime(),
});

router.get(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;

      const meetings = await prisma.meeting.findMany({
        where: { circleId },
        orderBy: { startTime: 'desc' },
        take: 20,
      });

      return sendSuccess(res, meetings);
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.post>[1],
  validate(createMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const { title, startTime } = req.body;
      const roomId = `skillshare-${circleId}-${uuidv4()}`.substring(0, 50);

      const meeting = await prisma.meeting.create({
        data: {
          title,
          roomId,
          circleId,
          startTime: new Date(startTime),
        },
      });

      return sendSuccess(res, { ...meeting, meetingUrl: `https://meet.jit.si/${roomId}` }, 201);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  '/:meetingId',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params['meetingId'] as string;

      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) throw new NotFoundError('Meeting');

      return sendSuccess(res, { ...meeting, meetingUrl: `https://meet.jit.si/${meeting.roomId}` });
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:meetingId',
  authenticate,
  requireCircleMember as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params['meetingId'] as string;
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      if (!['ADMIN', 'MODERATOR'].includes(member?.role || '')) {
        throw new ForbiddenError('Only admins and moderators can delete meetings');
      }

      await prisma.meeting.delete({ where: { id: meetingId } });

      return sendSuccess(res, null, 200, 'Meeting deleted');
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
