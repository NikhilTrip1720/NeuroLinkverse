import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, message?: string) {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
  });
}

export function sendError(res: Response, error: string, statusCode: number = 500, code?: string) {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(code && { code }),
  });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    },
  });
}
