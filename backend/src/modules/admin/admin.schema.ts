import { z } from 'zod';

// ─── Shared ────────────────────────────────────────────────────────────────

const pageSchema = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : 1))
  .pipe(z.number().int().positive().default(1));

const limitSchema = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : 10))
  .pipe(z.number().int().positive().max(100).default(10));

// ─── List Users ────────────────────────────────────────────────────────────

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['user', 'vendor', 'admin', 'manager']).optional(),
  status: z.enum(['pending', 'active', 'locked']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: pageSchema,
  limit: limitSchema,
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// ─── Patch User Status ─────────────────────────────────────────────────────

export const patchUserStatusBodySchema = z.object({
  status: z.enum(['active', 'locked']),
});

export type PatchUserStatusBody = z.infer<typeof patchUserStatusBodySchema>;

// ─── List Vendors ──────────────────────────────────────────────────────────

export const listVendorsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'locked']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: pageSchema,
  limit: limitSchema,
});

export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;

// ─── Patch Vendor Status ───────────────────────────────────────────────────

export const patchVendorStatusBodySchema = z.object({
  status: z.enum(['active', 'locked']),
});

export type PatchVendorStatusBody = z.infer<typeof patchVendorStatusBodySchema>;

// ─── DTOs ──────────────────────────────────────────────────────────────────

export interface AdminUserDTO {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone: string | null;
  createdAt: Date;
  emailVerifiedAt: Date | null;
}

export interface AdminVendorDTO {
  userId: number;
  shopName: string;
  shopSlug: string | null;
  ownerName: string;
  ownerEmail: string;
  status: string;
  bookCount: number;
  createdAt: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── List Admin Orders ──────────────────────────────────────────────────────

export const listAdminOrdersQuerySchema = z.object({
  search: z.string().optional(),
  vendorUserId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  status: z.enum(['NEW', 'COMPLETED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: pageSchema,
  limit: limitSchema,
});

export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;

// ─── List Admin Products ────────────────────────────────────────────────────

export const listAdminProductsQuerySchema = z.object({
  search: z.string().optional(),
  vendorUserId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
  page: pageSchema,
  limit: limitSchema,
});

export type ListAdminProductsQuery = z.infer<typeof listAdminProductsQuerySchema>;

// ─── Patch Product Status ───────────────────────────────────────────────────

export const patchProductStatusBodySchema = z.object({
  status: z.enum(['published', 'hidden']),
});

export type PatchProductStatusBody = z.infer<typeof patchProductStatusBodySchema>;

// ─── Admin Order DTOs ───────────────────────────────────────────────────────

export interface AdminOrderItemDTO {
  bookId: number;
  titleSnapshot: string;
  unitPrice: number;
}

export interface AdminPaymentSummaryDTO {
  status: string;
  amount: number;
  expiresAt: Date | null;
}

export interface AdminOrderSummaryDTO {
  code: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  vendorShops: string[];
  itemsBrief: string;
  total: number;
  currency: string;
  paymentStatus: string | null;
  createdAt: Date;
}

export interface AdminOrderDetailDTO {
  code: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  items: AdminOrderItemDTO[];
  payment: AdminPaymentSummaryDTO | null;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

// ─── Admin Product DTO ──────────────────────────────────────────────────────

export interface AdminProductDTO {
  id: number;
  title: string;
  slug: string | null;
  vendorShop: string;
  authorName: string | null;
  price: number;
  status: string;
  fileFormat: string;
  createdAt: Date;
}
