import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const key = issue.path.join('.');
          if (!errors[key]) {
            errors[key] = [];
          }
          errors[key].push(issue.message);
        }
        return next(new ValidationError('Validation failed', errors));
      }
      return next(error);
    }
  };
}
