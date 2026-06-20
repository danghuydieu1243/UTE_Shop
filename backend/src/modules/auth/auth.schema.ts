import { z } from 'zod';
import { passwordField } from '../../shared/validation/password';

const emailField = z.string().email().transform((v) => v.toLowerCase().trim());

export const registerSchema = z
  .object({
    accountType: z.enum(['user', 'vendor']),
    email: emailField,
    password: passwordField,
    fullName: z.string().min(1),
    shopName: z.string().min(1).optional(),
  })
  .refine((d) => d.accountType !== 'vendor' || !!d.shopName, {
    message: 'shopName là bắt buộc với tài khoản vendor',
    path: ['shopName'],
  });
export type RegisterDto = z.infer<typeof registerSchema>;

export const verifyOtpSchema = z.object({
  email: emailField,
  purpose: z.enum(['register', 'reset_password']),
  code: z.string().length(6),
});
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: emailField,
  purpose: z.enum(['register', 'reset_password']),
});
export type ResendOtpDto = z.infer<typeof resendOtpSchema>;

export const loginSchema = z.object({ email: emailField, password: z.string().min(1) });
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({
  email: emailField,
  resetToken: z.string().min(10),
  newPassword: passwordField,
});
export type ResetDto = z.infer<typeof resetSchema>;
