import bcrypt from 'bcrypt';
import * as authRepo from './auth.repository';
import * as otpService from './otp.service';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
  redirectForRole,
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
