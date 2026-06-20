import bcrypt from 'bcrypt';
import * as authRepo from './auth.repository';
import * as otpService from './otp.service';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
  redirectForRole,
  signResetToken,
  verifyResetToken,
} from './token.service';
import { AppError } from '../../shared/errors/AppError';
import { toPublicUser, PublicUser } from '../../shared/dto/user.dto';

interface Meta {
  userAgent?: string | null;
  ip?: string | null;
}

const SALT_ROUNDS = 10;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150) || 'shop';

const uniqueSlug = async (base: string): Promise<string> => {
  let slug = base;
  let i = 1;
  while (await authRepo.vendorSlugExists(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
};

const issueTokenPair = async (user: { id: number; role: string }, meta?: Meta) => {
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken();
  await authRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt(),
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
  });
  return { accessToken, refreshToken };
};

export const register = async (dto: {
  accountType: 'user' | 'vendor';
  email: string;
  password: string;
  fullName: string;
  shopName?: string;
}) => {
  const existing = await authRepo.findUserByEmail(dto.email);
  if (existing) throw AppError.from('EMAIL_TAKEN', 'Email đã được sử dụng');
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await authRepo.createUser({
    email: dto.email,
    passwordHash,
    role: dto.accountType,
    fullName: dto.fullName,
    status: 'pending',
  });
  if (dto.accountType === 'vendor') {
    const slug = await uniqueSlug(slugify(dto.shopName ?? dto.fullName));
    await authRepo.createVendor({ userId: user.id, shopName: dto.shopName as string, shopSlug: slug });
  }
  const { otpExpiresAt } = await otpService.issueOtp({ email: dto.email, userId: user.id, purpose: 'register' });
  return { email: dto.email, otpExpiresAt, purpose: 'register' as const };
};

export const verifyOtpRegister = async (params: { email: string; code: string }, meta?: Meta) => {
  await otpService.verifyOtp({ email: params.email, purpose: 'register', code: params.code });
  const user = await authRepo.findUserByEmail(params.email);
  if (!user) throw AppError.from('OTP_INVALID', 'Mã xác thực không đúng');
  await authRepo.setUserStatus(user.id, 'active', new Date());
  const tokens = await issueTokenPair(user, meta);
  const publicUser: PublicUser = { ...toPublicUser(user), status: 'active' };
  return { user: publicUser, ...tokens, redirect: redirectForRole(user.role) };
};

export const resendOtp = async (params: { email: string; purpose: 'register' | 'reset_password' }) => {
  const user = await authRepo.findUserByEmail(params.email);
  return otpService.issueOtp({ email: params.email, userId: user?.id ?? null, purpose: params.purpose });
};

export const login = async (dto: { email: string; password: string }, meta?: Meta) => {
  const user = await authRepo.findUserByEmail(dto.email, true);
  if (!user) throw AppError.from('AUTH_INVALID_CRED', 'Email hoặc mật khẩu không đúng');
  const matched = await bcrypt.compare(dto.password, user.passwordHash);
  if (!matched) throw AppError.from('AUTH_INVALID_CRED', 'Email hoặc mật khẩu không đúng');
  if (user.status === 'locked') throw AppError.from('ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
  if (user.status === 'pending') throw AppError.from('ACCOUNT_PENDING', 'Tài khoản chưa xác thực email');
  await authRepo.touchLastLogin(user.id);
  const tokens = await issueTokenPair(user, meta);
  return { user: toPublicUser(user), ...tokens, redirect: redirectForRole(user.role) };
};

export const refresh = async (rawToken: string, meta?: Meta) => {
  const rec = await authRepo.findRefreshByHash(hashToken(rawToken));
  if (!rec) throw AppError.from('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ');
  if (rec.revokedAt) {
    await authRepo.revokeAllUserRefresh(rec.userId);
    throw AppError.from('REFRESH_REUSED', 'Phát hiện tái sử dụng refresh token');
  }
  if (rec.expiresAt < new Date()) throw AppError.from('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn');
  const user = await authRepo.findUserById(rec.userId);
  if (!user) throw AppError.from('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ');
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const newRefresh = generateRefreshToken();
  const newRec = await authRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(newRefresh),
    expiresAt: refreshExpiresAt(),
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
  });
  await authRepo.revokeRefresh(rec.id, newRec.id);
  return { accessToken, refreshToken: newRefresh };
};

export const logout = async (rawToken: string): Promise<void> => {
  const rec = await authRepo.findRefreshByHash(hashToken(rawToken));
  if (rec && !rec.revokedAt) {
    await authRepo.revokeRefresh(rec.id);
  }
};

export const forgotPassword = async (params: { email: string }) => {
  const user = await authRepo.findUserByEmail(params.email);
  if (user) {
    await otpService.issueOtp({ email: params.email, userId: user.id, purpose: 'reset_password' });
  }
  return { message: 'Nếu email tồn tại, mã xác thực đã được gửi.' };
};

export const verifyOtpReset = async (params: { email: string; code: string }) => {
  await otpService.verifyOtp({ email: params.email, purpose: 'reset_password', code: params.code });
  return { resetToken: signResetToken(params.email) };
};

export const resetPassword = async (params: { email: string; resetToken: string; newPassword: string }) => {
  const { email } = verifyResetToken(params.resetToken);
  if (email !== params.email) throw AppError.from('RESET_TOKEN_INVALID', 'Mã đặt lại mật khẩu không hợp lệ');
  const user = await authRepo.findUserByEmail(email);
  if (!user) throw AppError.from('RESET_TOKEN_INVALID', 'Mã đặt lại mật khẩu không hợp lệ');
  const passwordHash = await bcrypt.hash(params.newPassword, SALT_ROUNDS);
  await authRepo.updateUserPassword(user.id, passwordHash);
  await authRepo.revokeAllUserRefresh(user.id);
  return { success: true as const };
};

export const getMe = async (userId: number) => {
  const user = await authRepo.findUserById(userId);
  if (!user) throw AppError.from('NOT_FOUND', 'Không tìm thấy người dùng');
  const base = toPublicUser(user);
  if (user.role === 'vendor') {
    const vendor = await authRepo.findVendorByUserId(userId);
    if (vendor) {
      return { ...base, shop: { shopName: vendor.shopName, shopSlug: vendor.shopSlug } };
    }
  }
  return base;
};
