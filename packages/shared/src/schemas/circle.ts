import { z } from 'zod';

export const createCircleSchema = z.object({
  name: z
    .string()
    .min(3, 'Circle name must be at least 3 characters')
    .max(100, 'Circle name must be at most 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be at most 500 characters'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be at most 100 characters'),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().min(2).max(100).default(20),
});

export const updateCircleSchema = createCircleSchema.partial();

export const joinCircleSchema = z.object({
  inviteCode: z.string().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;
export type UpdateCircleInput = z.infer<typeof updateCircleSchema>;
export type JoinCircleInput = z.infer<typeof joinCircleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
