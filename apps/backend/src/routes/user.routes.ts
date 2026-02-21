import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadLimiter } from '../middleware/rateLimiter';
import { updateProfileSchema } from '@skillshare-circles/shared';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ConflictError } from '../utils/errors';
import { env } from '../config/env';
import { getLevelFromXp, getXpForNextLevel, getProgressToNextLevel } from '../utils/xp';
import { sanitizeFilename } from '../utils/sanitize';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/profile/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        level: true,
        xp: true,
        streak: true,
        createdAt: true,
        _count: { select: { circleMembers: true } },
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    return sendSuccess(res, {
      ...user,
      progressToNextLevel: getProgressToNextLevel(user.xp),
      xpForNextLevel: getXpForNextLevel(user.level),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const { displayName, bio, username } = req.body;

    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (existing) throw new ConflictError('Username already taken');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...(displayName && { displayName }), ...(bio !== undefined && { bio }), ...(username && { username }) },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, bio: true, isEmailVerified: true,
        level: true, xp: true, streak: true,
      },
    });

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/me/avatar',
  authenticate,
  uploadLimiter,
  upload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;

      if (!req.file) {
        return next(new Error('No file uploaded'));
      }

      const uploadDir = path.join(env.UPLOAD_DIR, 'avatars');
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `${userId}-${Date.now()}.webp`;
      const filepath = path.join(uploadDir, sanitizeFilename(filename));

      await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(filepath);

      const avatarUrl = `/uploads/avatars/${filename}`;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: { avatarUrl: true },
      });

      return sendSuccess(res, user);
    } catch (error) {
      return next(error);
    }
  },
);

router.get('/me/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const [user, taskStats, messageCount, resourceCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, xp: true, streak: true },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { assigneeId: userId },
        _count: { id: true },
      }),
      prisma.message.count({ where: { authorId: userId } }),
      prisma.resource.count({ where: { uploaderId: userId } }),
    ]);

    if (!user) throw new NotFoundError('User');

    const tasks = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const stat of taskStats) {
      tasks[stat.status as keyof typeof tasks] = stat._count.id;
    }

    return sendSuccess(res, {
      level: user.level,
      xp: user.xp,
      streak: user.streak,
      progressToNextLevel: getProgressToNextLevel(user.xp),
      xpForNextLevel: getXpForNextLevel(user.level),
      tasks,
      messageCount,
      resourceCount,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/leaderboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 50,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        level: true,
        xp: true,
        streak: true,
      },
    });

    const leaderboard = users.map((user: typeof users[0], index: number) => ({
      rank: index + 1,
      user,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
    }));

    return sendSuccess(res, leaderboard);
  } catch (error) {
    return next(error);
  }
});

router.get('/me/notifications', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return sendPaginated(res, notifications, total, page, limit);
  } catch (error) {
    return next(error);
  }
});

router.patch('/me/notifications/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const { ids } = req.body;

    if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { userId, id: { in: ids } },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true },
      });
    }

    return sendSuccess(res, null, 200, 'Notifications marked as read');
  } catch (error) {
    return next(error);
  }
});

router.get('/me/achievements', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });

    return sendSuccess(res, userAchievements);
  } catch (error) {
    return next(error);
  }
});

export default router;
