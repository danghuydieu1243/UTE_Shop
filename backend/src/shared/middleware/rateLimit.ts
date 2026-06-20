import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

const WINDOW_MS = 60_000;
const MAX = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

export const authRateLimit: RequestHandler = (req, _res, next) => {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  rec.count += 1;
  if (rec.count > MAX) {
    return next(AppError.from('RATE_LIMITED', 'Quá nhiều yêu cầu, vui lòng thử lại sau'));
  }
  next();
};
