import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { aiLimiter } from '../middleware/rateLimiter';
import { studyPlanRequestSchema } from '@skillshare-circles/shared';
import { sendSuccess } from '../utils/response';
import { generateStudyPlan } from '../services/ai.service';
import { awardXp } from '../services/gamification.service';

const router = Router();

router.post(
  '/study-plan',
  authenticate,
  aiLimiter,
  validate(studyPlanRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const { subject, duration, level, goals, circleId } = req.body;

      const content = await generateStudyPlan({ subject, duration, level, goals });

      const durationLabel: Record<string, string> = {
        '1_week': '1 Week',
        '2_weeks': '2 Weeks',
        '1_month': '1 Month',
        '3_months': '3 Months',
        '6_months': '6 Months',
      };

      const studyPlan = await prisma.studyPlan.create({
        data: {
          title: `${subject} Study Plan - ${durationLabel[duration] || duration}`,
          subject,
          duration,
          level,
          content,
          userId,
          circleId: circleId || null,
        },
      });

      await awardXp(userId, 'GENERATE_STUDY_PLAN');

      return sendSuccess(res, studyPlan, 201);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  '/study-plans',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;

      const studyPlans = await prisma.studyPlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return sendSuccess(res, studyPlans);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  '/study-plans/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      const studyPlan = await prisma.studyPlan.findFirst({
        where: { id, userId },
      });

      if (!studyPlan) {
        return res.status(404).json({ success: false, error: 'Study plan not found' });
      }

      return sendSuccess(res, studyPlan);
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
