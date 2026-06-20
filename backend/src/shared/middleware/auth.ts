import { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../../modules/auth/token.service';

export const auth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.from('UNAUTHORIZED', 'Yêu cầu xác thực'));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (e) {
    next(e);
  }
};
