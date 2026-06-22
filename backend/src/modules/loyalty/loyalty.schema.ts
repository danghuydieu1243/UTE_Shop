import { z } from 'zod';

export const loyaltyQuerySchema = z.object({
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

export interface LoyaltyTxDTO {
  type: string;
  points: number;
  note: string | null;
  orderId: number | null;
  reviewId: number | null;
  createdAt: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LoyaltyDTO {
  balance: number;
  transactions: LoyaltyTxDTO[];
  pagination: PaginationMeta;
}
