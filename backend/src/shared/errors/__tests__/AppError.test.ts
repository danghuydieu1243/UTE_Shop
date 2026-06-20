import { AppError } from '../AppError';
import { ERR } from '../codes';

describe('AppError', () => {
  it('builds from ERR key with code + status', () => {
    const e = AppError.from('EMAIL_TAKEN', 'Email đã được sử dụng');
    expect(e.code).toBe('EMAIL_TAKEN');
    expect(e.status).toBe(409);
    expect(e.message).toBe('Email đã được sử dụng');
  });
  it('carries details', () => {
    const e = AppError.from('VALIDATION', 'Lỗi dữ liệu', [{ path: 'email' }]);
    expect(e.status).toBe(422);
    expect(e.details).toEqual([{ path: 'email' }]);
  });
  // tham chiếu ERR để chắc chắn import dùng được
  it('ERR has expected entries', () => {
    expect(ERR.EMAIL_TAKEN).toEqual(['EMAIL_TAKEN', 409]);
  });
});
