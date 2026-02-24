import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireCircleMember } from '../middleware/circleAuth';
import { createTaskSchema, updateTaskSchema } from '@skillshare-circles/shared';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { awardXp } from '../services/gamification.service';

const router = Router({ mergeParams: true });

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  circleId: true,
  creatorId: true,
  assigneeId: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  assignee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

router.get(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const status = req.query.status as string | undefined;
      const assigneeId = req.query.assigneeId as string | undefined;

      const tasks = await prisma.task.findMany({
        where: {
          circleId,
          ...(status && { status: status as 'TODO' | 'IN_PROGRESS' | 'DONE' }),
          ...(assigneeId && { assigneeId }),
        },
        select: TASK_SELECT,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      return sendSuccess(res, tasks);
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.post>[1],
  validate(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;
      const { title, description, assigneeId, priority, dueDate } = req.body;

      if (assigneeId) {
        const isMember = await prisma.circleMember.findUnique({
          where: { userId_circleId: { userId: assigneeId, circleId } },
        });
        if (!isMember) throw new ForbiddenError('Assignee must be a circle member');
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          circleId,
          creatorId: userId,
          assigneeId,
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        select: TASK_SELECT,
      });

      await awardXp(userId, 'CREATE_TASK');

      if (assigneeId && assigneeId !== userId) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            message: `You have been assigned: "${title}"`,
            link: `/circles/${circleId}?tab=tasks`,
          },
        });
      }

      return sendSuccess(res, task, 201);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  '/:taskId',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params['taskId'] as string;

      const task = await prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT });
      if (!task) throw new NotFoundError('Task');

      return sendSuccess(res, task);
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  '/:taskId',
  authenticate,
  requireCircleMember as Parameters<typeof router.patch>[1],
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params['taskId'] as string;
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { creatorId: true, assigneeId: true, status: true },
      });

      if (!existingTask) throw new NotFoundError('Task');

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      const canEdit =
        existingTask.creatorId === userId ||
        existingTask.assigneeId === userId ||
        ['ADMIN', 'MODERATOR'].includes(member?.role || '');

      if (!canEdit) throw new ForbiddenError('Cannot edit this task');

      const { assigneeId, dueDate, ...rest } = req.body;
      const updateData = {
        ...rest,
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      };

      const task = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        select: TASK_SELECT,
      });

      if (req.body.status === 'DONE' && existingTask.status !== 'DONE') {
        await awardXp(userId, 'COMPLETE_TASK');

        if (task.creatorId && task.creatorId !== userId) {
          await prisma.notification.create({
            data: {
              userId: task.creatorId,
              type: 'TASK_COMPLETED',
              title: 'Task Completed',
              message: `"${task.title}" has been completed`,
              link: `/circles/${circleId}?tab=tasks`,
            },
          });
        }
      }

      return sendSuccess(res, task);
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:taskId',
  authenticate,
  requireCircleMember as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params['taskId'] as string;
      const circleId = req.params['circleId'] as string;
      const userId = (req as AuthenticatedRequest).user.userId;

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { creatorId: true },
      });

      if (!task) throw new NotFoundError('Task');

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      const canDelete = task.creatorId === userId || ['ADMIN', 'MODERATOR'].includes(member?.role || '');
      if (!canDelete) throw new ForbiddenError('Cannot delete this task');

      await prisma.task.delete({ where: { id: taskId } });

      return sendSuccess(res, null, 200, 'Task deleted');
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
