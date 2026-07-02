/** adminApi — admin endpoints (Tasks 5–8).
 *  Tags are registered on baseApi so Tasks 5–8 can reference them.
 */
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { AdminUserRow, AdminVendorRow, AdminProductRow, AdminProductStatus } from './types';

// ── Order types ───────────────────────────────────────────────────────────────

export type AdminOrderStatus = 'NEW' | 'COMPLETED' | 'CANCELLED';
export type AdminPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED';

// Khớp chính xác BE AdminOrderSummaryDTO (admin.schema.ts)
export interface AdminOrderSummary {
  code: string;
  status: AdminOrderStatus;
  buyerName: string;
  buyerEmail: string;
  vendorShops: string[];
  itemsBrief: string;
  total: number;
  currency: string;
  paymentStatus: AdminPaymentStatus | string | null;
  createdAt: string;
}

// Khớp chính xác BE AdminOrderItemDTO (e-book: không có qty, ngầm định 1)
export interface AdminOrderItem {
  bookId: number;
  titleSnapshot: string;
  unitPrice: number;
}

// Khớp chính xác BE AdminPaymentSummaryDTO
export interface AdminPaymentSummary {
  status: string;
  amount: number;
  expiresAt: string | null;
}

// Khớp chính xác BE AdminOrderDetailDTO
export interface AdminOrderDetail {
  code: string;
  status: AdminOrderStatus;
  subtotal: number;
  total: number;
  currency: string;
  items: AdminOrderItem[];
  payment: AdminPaymentSummary | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

// BE listAdminOrdersQuerySchema nhận: search, vendorUserId, status, from, to, page, limit.
// KHÔNG có paymentStatus (Zod bỏ qua key thừa) → KHÔNG expose filter đó ở FE.
export interface AdminOrdersParams {
  search?: string;
  vendorUserId?: number | string;
  status?: AdminOrderStatus | '';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrdersResult {
  orders: AdminOrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── transformResponse (exported for contract testing) ─────────────────────────

/**
 * Transforms the raw baseApi response (envelope already unwrapped) into AdminOrdersResult.
 * baseApi passes: data = res.data.data (the array), meta = res.data.meta ({ pagination }).
 * Exported so tests can directly verify the array + meta reading logic.
 */
export const transformAdminOrdersResponse = (
  resp: AdminOrderSummary[],
  meta: EnvelopeMeta | undefined,
): AdminOrdersResult => ({
  orders: Array.isArray(resp) ? resp : [],
  pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUsersParams {
  search?: string;
  role?: 'user' | 'vendor' | 'manager' | 'admin' | '';
  status?: 'active' | 'locked' | 'pending' | '';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminUsersStats {
  total: number;
  active: number;
  locked: number;
  pending: number;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: AdminUsersStats;
}

export interface AdminUserDTO {
  id: number;
  email: string;
  fullName: string;
  role: 'user' | 'vendor' | 'manager' | 'admin';
  status: 'active' | 'locked' | 'pending';
  phone: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
}

// ── transformResponse (exported for contract testing) ─────────────────────────

/**
 * Transforms the raw baseApi response (envelope already unwrapped) into AdminUsersResult.
 * baseApi passes: data = res.data.data (the array), meta = res.data.meta ({ pagination }).
 * Exported so tests can directly verify the array + meta reading logic.
 */
const DEFAULT_STATS: AdminUsersStats = { total: 0, active: 0, locked: 0, pending: 0 };

export const transformAdminUsersResponse = (
  resp: AdminUserDTO[],
  meta: EnvelopeMeta | undefined,
): AdminUsersResult => ({
  users: Array.isArray(resp) ? resp : [],
  pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  stats: meta?.stats
    ? {
        total:   Number(meta.stats['total']   ?? 0),
        active:  Number(meta.stats['active']  ?? 0),
        locked:  Number(meta.stats['locked']  ?? 0),
        pending: Number(meta.stats['pending'] ?? 0),
      }
    : DEFAULT_STATS,
});

// ── Vendor types ──────────────────────────────────────────────────────────────

export interface AdminVendorsParams {
  search?: string;
  status?: 'active' | 'locked' | '';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminVendorsResult {
  vendors: AdminVendorRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── transformResponse (exported for contract testing) ─────────────────────────

/**
 * Transforms the raw baseApi response (envelope already unwrapped) into AdminVendorsResult.
 * baseApi passes: data = res.data.data (the array), meta = res.data.meta ({ pagination }).
 * Exported so tests can directly verify the array + meta reading logic.
 */
export const transformAdminVendorsResponse = (
  resp: AdminVendorRow[],
  meta: EnvelopeMeta | undefined,
): AdminVendorsResult => ({
  vendors: Array.isArray(resp) ? resp : [],
  pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
});

// ── Product types ───────────────────────────────────────────────────────────

// BE listAdminProductsQuerySchema: search, vendorUserId, status, page, limit (KHÔNG có date).
export interface AdminProductsParams {
  search?: string;
  vendorUserId?: number | string;
  status?: AdminProductStatus | '';
  page?: number;
  limit?: number;
}

export interface AdminProductsResult {
  products: AdminProductRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transforms the raw baseApi response (envelope already unwrapped) into AdminProductsResult.
 * baseApi passes: data = res.data.data (mảng product), meta = res.data.meta ({ pagination }).
 * Exported để test khóa shape mảng + meta.
 */
export const transformAdminProductsResponse = (
  resp: AdminProductRow[],
  meta: EnvelopeMeta | undefined,
): AdminProductsResult => ({
  products: Array.isArray(resp) ? resp : [],
  pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
});

// ── Commission setting types ────────────────────────────────────────────────

export interface CommissionSetting {
  rateBps: number;
  ratePercent: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /api/v1/admin/users — paginated user list (admin only).
     * baseApi unwraps envelope: data = array of users, meta = { pagination }.
     */
    getAdminUsers: build.query<AdminUsersResult, AdminUsersParams>({
      query: (params) => ({ url: '/admin/users', method: 'GET', params }),
      transformResponse: transformAdminUsersResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.users.map(({ id }) => ({ type: 'AdminUser' as const, id })),
              { type: 'AdminUser', id: 'LIST' },
            ]
          : [{ type: 'AdminUser', id: 'LIST' }],
    }),

    /**
     * PATCH /api/v1/admin/users/:id/status — lock or unlock a user.
     * Errors: ADMIN_CANNOT_LOCK_SELF (409), AUTH_FORBIDDEN (403).
     */
    updateUserStatus: build.mutation<AdminUserDTO, { id: number; status: 'active' | 'locked' }>({
      query: ({ id, status }) => ({
        url: `/admin/users/${id}/status`,
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'AdminUser', id },
        { type: 'AdminUser', id: 'LIST' },
      ],
    }),

    /**
     * GET /api/v1/admin/vendors — paginated vendor list (admin + manager).
     * baseApi unwraps envelope: data = array of vendors, meta = { pagination }.
     */
    getAdminVendors: build.query<AdminVendorsResult, AdminVendorsParams>({
      query: (params) => ({ url: '/admin/vendors', method: 'GET', params }),
      transformResponse: transformAdminVendorsResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.vendors.map(({ userId }) => ({ type: 'AdminVendor' as const, id: userId })),
              { type: 'AdminVendor', id: 'LIST' },
            ]
          : [{ type: 'AdminVendor', id: 'LIST' }],
    }),

    /**
     * PATCH /api/v1/admin/vendors/:id/status — lock or unlock a vendor.
     * :id is the vendor's userId. Sets both vendor + owner user status (transaction).
     */
    updateVendorStatus: build.mutation<AdminVendorRow, { id: number; status: 'active' | 'locked' }>({
      query: ({ id, status }) => ({
        url: `/admin/vendors/${id}/status`,
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'AdminVendor', id },
        { type: 'AdminVendor', id: 'LIST' },
      ],
    }),

    /**
     * GET /api/v1/admin/orders — paginated order list (admin + manager). READ-ONLY.
     * baseApi unwraps envelope: data = array of orders, meta = { pagination }.
     */
    getAdminOrders: build.query<AdminOrdersResult, AdminOrdersParams>({
      query: (params) => ({ url: '/admin/orders', method: 'GET', params }),
      transformResponse: transformAdminOrdersResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map(({ code }) => ({ type: 'AdminOrder' as const, id: code })),
              { type: 'AdminOrder', id: 'LIST' },
            ]
          : [{ type: 'AdminOrder', id: 'LIST' }],
    }),

    /**
     * GET /api/v1/admin/orders/:code — order detail (admin + manager). READ-ONLY.
     * 404 RESOURCE_NOT_FOUND if missing.
     * NEVER includes provider_txn_id.
     */
    getAdminOrderDetail: build.query<AdminOrderDetail, string>({
      query: (code) => ({ url: `/admin/orders/${code}`, method: 'GET' }),
      providesTags: (_result, _err, code) => [{ type: 'AdminOrder', id: code }],
    }),

    /**
     * GET /api/v1/admin/products — paginated product list toàn sàn (admin + manager).
     * baseApi unwraps envelope: data = mảng product, meta = { pagination }.
     */
    getAdminProducts: build.query<AdminProductsResult, AdminProductsParams>({
      query: (params) => ({ url: '/admin/products', method: 'GET', params }),
      transformResponse: transformAdminProductsResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ id }) => ({ type: 'AdminProduct' as const, id })),
              { type: 'AdminProduct', id: 'LIST' },
            ]
          : [{ type: 'AdminProduct', id: 'LIST' }],
    }),

    /**
     * PATCH /api/v1/admin/products/:id/status — gỡ ('hidden') / khôi phục ('published').
     * 'hidden' biến mất khỏi catalog public. Idempotent.
     */
    updateProductStatus: build.mutation<AdminProductRow, { id: number; status: 'published' | 'hidden' }>({
      query: ({ id, status }) => ({
        url: `/admin/products/${id}/status`,
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'AdminProduct', id },
        { type: 'AdminProduct', id: 'LIST' },
      ],
    }),

    /**
     * GET /api/v1/admin/settings/commission — tỉ lệ phí sàn hiện hành (admin only).
     */
    getCommission: build.query<CommissionSetting, void>({
      query: () => ({ url: '/admin/settings/commission', method: 'GET' }),
      providesTags: ['CommissionSetting'],
    }),

    /**
     * PATCH /api/v1/admin/settings/commission — đổi tỉ lệ phí sàn (admin only).
     * Áp dụng cho đơn thanh toán từ sau khi lưu; đơn cũ không đổi.
     */
    updateCommission: build.mutation<CommissionSetting, { ratePercent: number }>({
      query: (body) => ({ url: '/admin/settings/commission', method: 'PATCH', data: body }),
      invalidatesTags: ['CommissionSetting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminUsersQuery,
  useUpdateUserStatusMutation,
  useGetAdminVendorsQuery,
  useUpdateVendorStatusMutation,
  useGetAdminOrdersQuery,
  useGetAdminOrderDetailQuery,
  useGetAdminProductsQuery,
  useUpdateProductStatusMutation,
  useGetCommissionQuery,
  useUpdateCommissionMutation,
} = adminApi;
