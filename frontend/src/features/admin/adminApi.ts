/** adminApi — admin endpoints (Tasks 5–8).
 *  Tags are registered on baseApi so Tasks 5–8 can reference them.
 */
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { AdminUserRow } from './types';

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
  }),
  overrideExisting: false,
});

export const {
  useGetAdminUsersQuery,
  useUpdateUserStatusMutation,
} = adminApi;
