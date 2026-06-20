import { ERR, ErrKey } from './codes';
export class AppError extends Error {
  constructor(public code: string, public status: number, message: string, public details?: unknown) {
    super(message); this.name = 'AppError';
  }
  static from(key: ErrKey, message: string, details?: unknown) {
    const [code, status] = ERR[key];
    return new AppError(code as string, status as number, message, details);
  }
}
