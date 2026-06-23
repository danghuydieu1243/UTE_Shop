import { z } from 'zod';

export const createBankAccountSchema = z.object({
  bankName: z.string().min(1).max(100),
  accountNumber: z.string().min(4).max(40).regex(/^\d+$/, 'Số tài khoản chỉ chứa chữ số'),
  accountHolder: z.string().min(1).max(120),
  isDefault: z.boolean().optional(),
});

export const updateBankAccountSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountNumber: z.string().min(4).max(40).regex(/^\d+$/, 'Số tài khoản chỉ chứa chữ số').optional(),
  accountHolder: z.string().min(1).max(120).optional(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

export function maskAccount(num: string): string {
  const last4 = num.slice(-4);
  return '****' + last4;
}

export interface BankAccountDTO {
  id: number;
  bankName: string;
  accountNumberMasked: string;
  accountHolder: string;
  isDefault: boolean;
  createdAt: Date | null;
}
