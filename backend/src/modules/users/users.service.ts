import bcrypt from 'bcrypt';
import * as usersRepo from './users.repository';
import { AppError } from '../../shared/errors/AppError';
import { toPublicUser } from '../../shared/dto/user.dto';

const SALT_ROUNDS = 10;

export const updateProfile = async (userId: number, data: { fullName?: string; phone?: string }) => {
  await usersRepo.updateProfile(userId, data);
  const user = await usersRepo.findById(userId);
  if (!user) throw AppError.from('NOT_FOUND', 'Không tìm thấy người dùng');
  return toPublicUser(user);
};

export const changePassword = async (userId: number, data: { currentPassword: string; newPassword: string }) => {
  const user = await usersRepo.findByIdWithSecret(userId);
  if (!user) throw AppError.from('NOT_FOUND', 'Không tìm thấy người dùng');
  const matched = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!matched) throw AppError.from('PASSWORD_MISMATCH', 'Mật khẩu hiện tại không đúng');
  const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  await usersRepo.updatePassword(userId, passwordHash);
  return { success: true as const };
};
