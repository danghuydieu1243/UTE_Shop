import { Op } from 'sequelize';
import { User, Vendor, OtpCode, RefreshToken } from '../../db/models';

export async function findUserByEmail(email: string, withSecret = false): Promise<User | null> {
  return User.scope(withSecret ? 'withSecret' : 'defaultScope').findOne({ where: { email } });
}

export async function findUserById(id: number, withSecret = false): Promise<User | null> {
  return User.scope(withSecret ? 'withSecret' : 'defaultScope').findOne({ where: { id } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  role: string;
  fullName: string;
  phone?: string | null;
  status?: string;
}): Promise<User> {
  return User.create({
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    fullName: data.fullName,
    phone: data.phone ?? null,
    status: data.status ?? 'pending',
  });
}

export async function setUserStatus(id: number, status: string, emailVerifiedAt?: Date): Promise<void> {
  const values: Partial<{ status: string; emailVerifiedAt: Date }> = { status };
  if (emailVerifiedAt !== undefined) {
    values.emailVerifiedAt = emailVerifiedAt;
  }
  await User.update(values, { where: { id } });
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  await User.update({ passwordHash }, { where: { id } });
}

export async function touchLastLogin(id: number): Promise<void> {
  await User.update({ lastLoginAt: new Date() }, { where: { id } });
}

export async function createVendor(data: {
  userId: number;
  shopName: string;
  shopSlug: string;
  description?: string | null;
}): Promise<Vendor> {
  return Vendor.create({
    userId: data.userId,
    shopName: data.shopName,
    shopSlug: data.shopSlug,
    description: data.description ?? null,
  });
}

export async function findVendorByUserId(userId: number): Promise<Vendor | null> {
  return Vendor.findOne({ where: { userId } });
}

export async function vendorSlugExists(slug: string): Promise<boolean> {
  const count = await Vendor.count({ where: { shopSlug: slug } });
  return count > 0;
}

export async function createOtp(data: {
  userId?: number | null;
  email: string;
  purpose: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt?: Date | null;
}): Promise<OtpCode> {
  return OtpCode.create({
    userId: data.userId ?? null,
    email: data.email,
    purpose: data.purpose,
    codeHash: data.codeHash,
    expiresAt: data.expiresAt,
    resendAvailableAt: data.resendAvailableAt ?? null,
  });
}

export async function findActiveOtp(email: string, purpose: string): Promise<OtpCode | null> {
  return OtpCode.findOne({
    where: { email, purpose, consumedAt: null },
    order: [['created_at', 'DESC']],
  });
}

export async function incrementOtpAttempts(id: number): Promise<void> {
  await OtpCode.increment('attempts', { where: { id } });
}

export async function consumeOtp(id: number): Promise<void> {
  await OtpCode.update({ consumedAt: new Date() }, { where: { id } });
}

export async function setOtpResendAt(id: number, at: Date): Promise<void> {
  await OtpCode.update({ resendAvailableAt: at }, { where: { id } });
}

export async function createRefreshToken(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<RefreshToken> {
  return RefreshToken.create({
    userId: data.userId,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    userAgent: data.userAgent ?? null,
    ip: data.ip ?? null,
  });
}

export async function findRefreshByHash(tokenHash: string): Promise<RefreshToken | null> {
  return RefreshToken.findOne({ where: { tokenHash } });
}

export async function revokeRefresh(id: number, replacedBy?: number | null): Promise<void> {
  const values: Partial<{ revokedAt: Date; replacedBy: number | null }> = { revokedAt: new Date() };
  if (replacedBy !== undefined) {
    values.replacedBy = replacedBy;
  }
  await RefreshToken.update(values, { where: { id } });
}

export async function revokeAllUserRefresh(userId: number): Promise<void> {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: { [Op.is]: null as unknown as null } } },
  );
}
