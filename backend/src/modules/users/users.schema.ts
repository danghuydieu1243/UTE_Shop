import { z } from 'zod';
import { passwordField } from '../../shared/validation/password';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().max(20).optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
