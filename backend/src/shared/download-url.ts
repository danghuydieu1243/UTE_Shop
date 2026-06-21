/**
 * Tiện ích ký / xác thực JWT download (short-lived 5 phút).
 * Payload: { sub: userId, bookId, purpose: 'download' }
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errors/AppError';

interface DownloadPayload {
  sub: number;   // userId
  bookId: number;
  purpose: 'download';
}

/**
 * Tạo signed download token.
 * Token hết hạn sau 5 phút.
 */
export function signDownloadToken(params: { userId: number; bookId: number }): string {
  const payload: DownloadPayload = {
    sub: params.userId,
    bookId: params.bookId,
    purpose: 'download',
  };
  return jwt.sign(payload, env.DOWNLOAD_URL_SECRET, { expiresIn: '5m' } as jwt.SignOptions);
}

/**
 * Xác thực download token.
 * Ném AppError DOWNLOAD_TOKEN_INVALID nếu token sai / hết hạn / sai purpose.
 */
export function verifyDownloadToken(token: string): { userId: number; bookId: number } {
  try {
    const decoded = jwt.verify(token, env.DOWNLOAD_URL_SECRET) as jwt.JwtPayload;
    if (decoded.purpose !== 'download' || !decoded.sub || !decoded.bookId) {
      throw new Error('payload không hợp lệ');
    }
    return {
      userId: Number(decoded.sub),
      bookId: Number(decoded.bookId),
    };
  } catch {
    throw AppError.from('DOWNLOAD_TOKEN_INVALID', 'Token tải xuống không hợp lệ hoặc đã hết hạn');
  }
}
