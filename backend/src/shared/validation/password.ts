import { z } from 'zod';

export const PASSWORD_4GROUPS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/;

export const passwordField = z
  .string()
  .regex(PASSWORD_4GROUPS, 'Mật khẩu phải ≥9 ký tự, đủ chữ hoa, chữ thường, số và ký tự đặc biệt');
