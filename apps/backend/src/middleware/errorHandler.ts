import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Request error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.code && { code: error.code }),
      ...(error.name === 'ValidationError' &&
        'errors' in error && { errors: (error as AppError & { errors?: unknown }).errors }),
    });
    return;
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as Error & { code?: string };
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        code: 'CONFLICT',
      });
      return;
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    code: 'NOT_FOUND',
  });
}
