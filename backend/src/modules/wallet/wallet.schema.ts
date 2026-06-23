import { z } from 'zod';

export const walletQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive().default(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().positive().max(100).default(10)),
});

export interface MonthPoint {
  month: string;
  value: number;
}

export interface WalletTxDTO {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WalletDTO {
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  monthlySeries: MonthPoint[];
  transactions: WalletTxDTO[];
  pagination: PaginationMeta;
}
