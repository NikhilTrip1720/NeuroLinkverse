import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@skillshare-circles/shared';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getCookieOptions,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from '../utils/jwt';
import { sendSuccess } from '../utils/response';
import { AuthError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { sendEmail, getVerificationEmailHtml, getPasswordResetEmailHtml } from '../config/email';
import { env } from '../config/env';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, displayName, password } = req.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new ConflictError('Email already registered');

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) throw new ConflictError('Username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { email, username, displayName, passwordHash, emailVerifyToken },
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${emailVerifyToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify your Skillshare Circles account',
      html: getVerificationEmailHtml(verifyUrl),
    }).catch(() => {});

    return sendSuccess(
      res,
      { id: user.id, email: user.email, username: user.username },
      201,
      'Registration successful. Please check your email to verify your account.',
    );
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, displayName: true, passwordHash: true, isEmailVerified: true },
    });

    if (!user) throw new AuthError('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new AuthError('Invalid email or password');

    const payload = { userId: user.id, email: user.email, username: user.username };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
      },
    });

    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new AuthError('Refresh token required');

    const payload = verifyRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AuthError('Invalid or expired refresh token');
    }

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    });
    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    });

    await prisma.refreshToken.delete({ where: { token } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
      },
    });

    res.cookie('accessToken', newAccessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return sendSuccess(res, { message: 'Tokens refreshed' });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return sendSuccess(res, null, 200, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
});

router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) throw new ValidationError('Verification token required');

    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new NotFoundError('Verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    return sendSuccess(res, null, 200, 'Email verified successfully');
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: 'Reset your Skillshare Circles password',
        html: getPasswordResetEmailHtml(resetUrl),
      }).catch(() => {});
    }

    return sendSuccess(
      res,
      null,
      200,
      'If an account with that email exists, a password reset link has been sent.',
    );
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) throw new ValidationError('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return sendSuccess(res, null, 200, 'Password reset successfully. Please log in with your new password.');
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as AuthenticatedRequest).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) throw new NotFoundError('User');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId } });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return sendSuccess(res, null, 200, 'Password changed successfully');
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isEmailVerified: true,
        level: true,
        xp: true,
        streak: true,
        createdAt: true,
        _count: { select: { circleMembers: true, createdTasks: true } },
      },
    });

    if (!user) throw new NotFoundError('User');

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
});

export default router;
