import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters')
    .optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional().nullable(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
});

export const studyPlanRequestSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be at most 100 characters'),
  duration: z.enum(['1_week', '2_weeks', '1_month', '3_months', '6_months']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  goals: z.string().max(500, 'Goals must be at most 500 characters').optional(),
  circleId: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type StudyPlanRequestInput = z.infer<typeof studyPlanRequestSchema>;
