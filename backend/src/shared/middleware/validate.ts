import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../errors/AppError';

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse((req as unknown as Record<string, unknown>)[source]);
    if (!result.success) {
      return next(AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues));
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
