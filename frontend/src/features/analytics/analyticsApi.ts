/** analyticsApi — RTK Query endpoints cho vendor + admin dashboard (Phase 6b). */
import { baseApi } from '../../shared/api/baseApi';
import type { VendorDashboard, AdminDashboard } from './types';

/** Passthrough transforms — baseApi đã unwrap envelope, transformResponse nhận object trực tiếp. */
export const transformVendorDashboard = (resp: VendorDashboard): VendorDashboard => resp;
export const transformAdminDashboard = (resp: AdminDashboard): AdminDashboard => resp;

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVendorDashboard: build.query<VendorDashboard, string>({
      query: (period) => ({ url: '/vendor/stats/dashboard', method: 'GET', params: { period } }),
      transformResponse: transformVendorDashboard,
      providesTags: [{ type: 'Analytics', id: 'VENDOR' }],
    }),
    getAdminDashboard: build.query<AdminDashboard, string>({
      query: (period) => ({ url: '/admin/stats/dashboard', method: 'GET', params: { period } }),
      transformResponse: transformAdminDashboard,
      providesTags: [{ type: 'Analytics', id: 'ADMIN' }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetVendorDashboardQuery, useGetAdminDashboardQuery } = analyticsApi;
