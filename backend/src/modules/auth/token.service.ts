import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

export interface AccessPayload {
  id: number;
  role: string;
}

export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    return { id: Number(decoded.id), role: String(decoded.role) };
  } catch {
    throw AppError.from('UNAUTHORIZED', 'Token không hợp lệ hoặc đã hết hạn');
  }
};

export const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateRefreshToken = (): string => crypto.randomBytes(48).toString('hex');

const parseTtlMs = (ttl: string): number => {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const mult = m[2] === 's' ? 1000 : m[2] === 'm' ? 60000 : m[2] === 'h' ? 3600000 : 86400000;
  return n * mult;
};

export const refreshExpiresAt = (): Date => new Date(Date.now() + parseTtlMs(env.JWT_REFRESH_TTL));

export const signResetToken = (email: string): string =>
  jwt.sign({ email, purpose: 'reset' }, env.JWT_ACCESS_SECRET, { expiresIn: '10m' } as jwt.SignOptions);

export const verifyResetToken = (token: string): { email: string } => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (decoded.purpose !== 'reset' || !decoded.email) throw new Error('invalid');
    return { email: String(decoded.email) };
  } catch {
    throw AppError.from('RESET_TOKEN_INVALID', 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  }
};

export const redirectForRole = (role: string): string =>
  role === 'vendor' ? '/vendor/dashboard' : role === 'admin' || role === 'manager' ? '/admin/dashboard' : '/';
