import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.from('FORBIDDEN', 'Bạn không có quyền truy cập'));
    }
    next();
  };
