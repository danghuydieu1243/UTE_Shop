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
