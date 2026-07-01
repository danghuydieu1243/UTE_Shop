import { z } from 'zod';
import { passwordField } from '../../shared/validation/password';

// SĐT di động VN: 10 chữ số, bắt đầu bằng 0
const VN_PHONE = /^0\d{9}$/;

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự')
    .optional(),
  // Chuỗi rỗng = xoá SĐT; nếu nhập thì phải đúng định dạng VN
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || VN_PHONE.test(v), 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
    .optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
