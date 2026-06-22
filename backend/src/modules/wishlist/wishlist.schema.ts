import { z } from 'zod';

export const addItemBodySchema = z.object({
  bookId: z
    .number({ invalid_type_error: 'bookId phải là số nguyên' })
    .int()
    .positive('bookId phải là số dương'),
});

export const removeItemParamsSchema = z.object({
  bookId: z
    .string()
    .regex(/^\d+$/, 'bookId phải là số nguyên dương')
    .transform(Number),
});

export const listQuerySchema = z.object({
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

export type AddItemBody = z.infer<typeof addItemBodySchema>;
export type RemoveItemParams = z.infer<typeof removeItemParamsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

// ── DTO types ─────────────────────────────────────────────────────────────────

export interface WishlistBookDTO {
  id: number;
  slug: string | null;
  title: string;
  coverImageUrl: string | null;
  price: number;
  ratingAvg: number | null;
}

export interface WishlistItemDTO {
  wishlistId: number;
  bookId: number;
  addedAt: Date;
  book: WishlistBookDTO;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
