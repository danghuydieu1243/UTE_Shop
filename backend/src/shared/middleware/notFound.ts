import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
export const notFound: RequestHandler = (_req, _res, next) =>
  next(AppError.from('NOT_FOUND', 'Không tìm thấy tài nguyên'));
