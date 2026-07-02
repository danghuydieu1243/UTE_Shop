import { z } from 'zod';

// ── Body schemas ──────────────────────────────────────────────────────────────

export const createOrderBodySchema = z.object({
  couponCode: z.string().optional(),
  pointsToUse: z.number().int().min(0).optional(),
  selectedCartItemIds: z.array(z.number().int().positive()).min(1).optional(),
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

// ── Query params ──────────────────────────────────────────────────────────────

export const listOrdersQuerySchema = z.object({
  status: z.enum(['NEW', 'COMPLETED', 'CANCELLED']).optional(),
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

export const orderCodeParamSchema = z.object({
  code: z.string().min(1),
});

// ── DTO types ─────────────────────────────────────────────────────────────────

export interface PaymentDTO {
  id: number;
  status: string;
  amount: number;
  currency: string;
  referenceCode: string;
  qrPayload: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  // TUYỆT ĐỐI KHÔNG thêm providerTxnId vào đây
}

export interface OrderItemDTO {
  bookId: number;
  slug: string | null;
  title: string;
  coverImageUrl: string | null;
  unitPrice: number;
}

export interface OrderDetailDTO {
  code: string;
  status: string;
  subtotal: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  total: number;
  currency: string;
  items: OrderItemDTO[];
  payment: PaymentDTO | null;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface OrderSummaryDTO {
  code: string;
  status: string;
  itemCount: number;
  total: number;
  currency: string;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
