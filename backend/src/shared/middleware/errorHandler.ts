import { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { ERR } from '../errors/codes';
import { logger } from '../logger';
import { env } from '../../config/env';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  logger.error({ err }, 'Unhandled error');
  const [code, status] = ERR.INTERNAL;
  const message = env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : (err?.message ?? 'Lỗi hệ thống');
  return res.status(status as number).json({ success: false, error: { code, message } });
};
