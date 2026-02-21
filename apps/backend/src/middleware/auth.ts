import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { AuthError } from '../utils/errors';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload & { dbUser?: { id: string; username: string; displayName: string } };
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || extractBearerToken(req);

  if (!token) {
    return next(new AuthError('Access token required'));
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
    return next();
  } catch {
    return next(new AuthError('Invalid or expired access token'));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || extractBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
  } catch {
    // ignore invalid token for optional auth
  }

  return next();
}

export async function requireEmailVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authReq = req as AuthenticatedRequest;
  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: { isEmailVerified: true },
  });

  if (!user?.isEmailVerified) {
    return next(new AuthError('Email verification required'));
  }

  return next();
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
