import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { VendorOrderRow, VendorOrdersResult, VendorOrdersParams } from './types';

export const vendorOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /vendor/orders — danh sách đơn hàng chứa E-book của vendor (read-only)
    getVendorOrders: build.query<VendorOrdersResult, VendorOrdersParams>({
      query: (params) => ({ url: '/vendor/orders', method: 'GET', params }),
      transformResponse: (resp: VendorOrderRow[], meta: EnvelopeMeta | undefined) => ({
        orders: resp ?? [],
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
