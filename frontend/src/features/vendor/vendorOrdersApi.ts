import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { VendorOrdersResult, VendorOrdersParams } from './types';

export const vendorOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /vendor/orders — danh sách đơn hàng chứa E-book của vendor (read-only)
    getVendorOrders: build.query<VendorOrdersResult, VendorOrdersParams>({
      query: (params) => ({ url: '/vendor/orders', method: 'GET', params }),
      transformResponse: (
        resp: VendorOrdersResult['orders'] | { orders: VendorOrdersResult['orders'] },
        meta: EnvelopeMeta | undefined,
      ) => ({
        orders: Array.isArray(resp) ? resp : ((resp as { orders: VendorOrdersResult['orders'] }).orders ?? []),
        pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map(({ code }) => ({ type: 'VendorOrder' as const, id: code })),
              { type: 'VendorOrder', id: 'LIST' },
            ]
          : [{ type: 'VendorOrder', id: 'LIST' }],
    }),
  }),
});

export const { useGetVendorOrdersQuery } = vendorOrdersApi;
