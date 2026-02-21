import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireCircleMember } from '../middleware/circleAuth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { awardXp } from '../services/gamification.service';
import { env } from '../config/env';
import { sanitizeFilename } from '../utils/sanitize';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
});

const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  type: z.enum(['LINK', 'FILE', 'NOTE']).default('LINK'),
  note: z.string().max(5000).optional(),
});

const RESOURCE_SELECT = {
  id: true,
  title: true,
  description: true,
  url: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  type: true,
  circleId: true,
  uploaderId: true,
  createdAt: true,
  uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

router.get(
  '/',
  authenticate,
  requireCircleMember as Parameters<typeof router.get>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { circleId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string | undefined;
      const skip = (page - 1) * limit;

      const where = {
        circleId,
        ...(type && { type: type as 'LINK' | 'FILE' | 'NOTE' }),
      };

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where,
          select: RESOURCE_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.resource.count({ where }),
      ]);

      return sendPaginated(res, resources, total, page, limit);
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/',
  authenticate,
  uploadLimiter,
  requireCircleMember as Parameters<typeof router.post>[1],
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { circleId } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      const body = createResourceSchema.parse(req.body);

      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let resourceType = body.type;

      if (req.file) {
        const uploadDir = path.join(env.UPLOAD_DIR, 'resources');
        await fs.mkdir(uploadDir, { recursive: true });

        const sanitized = sanitizeFilename(req.file.originalname);
        const filename = `${Date.now()}-${sanitized}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, req.file.buffer);

        fileUrl = `/uploads/resources/${filename}`;
        fileName = req.file.originalname;
        fileSize = req.file.size;
        resourceType = 'FILE';
      }

      const resource = await prisma.resource.create({
        data: {
          title: body.title,
          description: body.description,
          url: body.url,
          fileUrl,
          fileName,
          fileSize,
          type: resourceType,
          circleId,
          uploaderId: userId,
        },
        select: RESOURCE_SELECT,
      });

      await awardXp(userId, 'UPLOAD_RESOURCE');

      return sendSuccess(res, resource, 201);
    } catch (error) {
      return next(error);
    }
  },
);

router.delete(
  '/:resourceId',
  authenticate,
  requireCircleMember as Parameters<typeof router.delete>[1],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resourceId, circleId } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { uploaderId: true, fileUrl: true },
      });

      if (!resource) throw new NotFoundError('Resource');

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      const canDelete = resource.uploaderId === userId || ['ADMIN', 'MODERATOR'].includes(member?.role || '');
      if (!canDelete) throw new ForbiddenError('Cannot delete this resource');

      if (resource.fileUrl) {
        const filepath = path.join(process.cwd(), resource.fileUrl);
        await fs.unlink(filepath).catch(() => {});
      }

      await prisma.resource.delete({ where: { id: resourceId } });

      return sendSuccess(res, null, 200, 'Resource deleted');
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
