import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export function requireCircleMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireCircleRole(['ADMIN', 'MODERATOR', 'MEMBER'])(req, res, next);
}

export function requireCircleModerator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  return requireCircleRole(['ADMIN', 'MODERATOR'])(req, res, next);
}

export function requireCircleAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireCircleRole(['ADMIN'])(req, res, next);
}

function requireCircleRole(roles: string[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const circleId = req.params.circleId;
      const userId = req.user.userId;

      const circle = await prisma.circle.findUnique({
        where: { id: circleId },
        select: { id: true },
      });

      if (!circle) {
        return next(new NotFoundError('Circle'));
      }

      const member = await prisma.circleMember.findUnique({
        where: { userId_circleId: { userId, circleId } },
        select: { role: true },
      });

      if (!member) {
        return next(new ForbiddenError('You are not a member of this circle'));
      }

      if (!roles.includes(member.role)) {
        return next(new ForbiddenError('Insufficient permissions'));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
