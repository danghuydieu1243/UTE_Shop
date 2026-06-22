import { z } from 'zod';

// ── Create Review ─────────────────────────────────────────────────────────────

export const createReviewBodySchema = z.object({
  bookId: z
    .number({ invalid_type_error: 'bookId phải là số nguyên' })
    .int()
    .positive('bookId phải là số dương'),
  rating: z
    .number({ invalid_type_error: 'rating phải là số nguyên' })
    .int('rating phải là số nguyên')
    .min(1, 'rating tối thiểu là 1')
    .max(5, 'rating tối đa là 5'),
  comment: z.string().max(2000).optional(),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

// ── Vendor Reply ──────────────────────────────────────────────────────────────

export const replyBodySchema = z.object({
  reply: z.string().min(1, 'reply không được rỗng').max(2000),
});

export type ReplyBody = z.infer<typeof replyBodySchema>;

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ReviewDTO {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: Date | null;
  vendorReply: string | null;
  vendorRepliedAt: Date | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
