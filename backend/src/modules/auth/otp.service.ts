import { hashToken } from './token.service';
import * as authRepo from './auth.repository';
import { AppError } from '../../shared/errors/AppError';
import { sendOtpEmail } from '../../shared/email/mailer';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export const generateOtp = (): string => String(Math.floor(100000 + Math.random() * 900000));
export const hashOtp = (code: string): string => hashToken(code);

export const issueOtp = async (params: { email: string; userId?: number | null; purpose: string }) => {
  const existing = await authRepo.findActiveOtp(params.email, params.purpose);
  if (existing && existing.resendAvailableAt && existing.resendAvailableAt > new Date()) {
    throw AppError.from('OTP_RESEND_COOLDOWN', 'Vui lòng đợi trước khi yêu cầu gửi lại mã');
  }
  const code = generateOtp();
  const now = Date.now();
  const otpExpiresAt = new Date(now + OTP_TTL_MS);
  const resendAvailableAt = new Date(now + RESEND_COOLDOWN_MS);
  await authRepo.createOtp({
    userId: params.userId ?? null,
    email: params.email,
    purpose: params.purpose,
    codeHash: hashOtp(code),
    expiresAt: otpExpiresAt,
    resendAvailableAt,
  });
  await sendOtpEmail(params.email, code, params.purpose);
  return { otpExpiresAt, resendAvailableAt };
};

export const verifyOtp = async (params: { email: string; purpose: string; code: string }) => {
  const otp = await authRepo.findActiveOtp(params.email, params.purpose);
  if (!otp) throw AppError.from('OTP_INVALID', 'Mã xác thực không đúng');
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw AppError.from('OTP_TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới');
  }
  if (otp.expiresAt < new Date()) throw AppError.from('OTP_EXPIRED', 'Mã xác thực đã hết hạn');
  if (otp.codeHash !== hashOtp(params.code)) {
    await authRepo.incrementOtpAttempts(otp.id);
    throw AppError.from('OTP_INVALID', 'Mã xác thực không đúng');
  }
  await authRepo.consumeOtp(otp.id);
  return otp;
};
