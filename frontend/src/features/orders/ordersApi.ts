import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { OrderDetail, Payment, GetOrdersParams, OrderSummary, OrdersResult } from './types';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // POST /orders — tạo đơn hàng từ giỏ hàng hiện tại
    // Task 8: nhận thêm couponCode và pointsToUse
    createOrder: build.mutation<OrderDetail, { couponCode?: string; pointsToUse?: number; selectedCartItemIds?: number[] }>({
      query: (body) => ({ url: '/orders', method: 'POST', data: body ?? {} }),
      invalidatesTags: ['Cart', 'Order'],
    }),

    // GET /orders/:code — lấy chi tiết đơn hàng
    getOrder: build.query<OrderDetail, string>({
      query: (code) => ({ url: `/orders/${code}`, method: 'GET' }),
      providesTags: (_result, _err, code) => [{ type: 'Order' as const, id: code }],
    }),

    // POST /orders/:code/cancel — hủy đơn hàng
    cancelOrder: build.mutation<OrderDetail, string>({
      query: (code) => ({ url: `/orders/${code}/cancel`, method: 'POST' }),
      invalidatesTags: (_result, _err, code) => [
        { type: 'Order' as const, id: code },
        { type: 'Order' as const, id: 'LIST' },
      ],
    }),

    // POST /orders/:code/payment — tạo lại QR payment
    recreatePayment: build.mutation<Payment, string>({
      query: (code) => ({ url: `/orders/${code}/payment`, method: 'POST' }),
      invalidatesTags: (_result, _err, code) => [{ type: 'Order' as const, id: code }],
    }),

    // POST /payments/:id/simulate — giả lập thanh toán thành công
    // Thành công → đơn COMPLETED + cấp entitlement → invalidate:
    // - Ebook: /user/ebooks refetch
    // - OwnedBooks: catalog đánh dấu lại "đã mua"
    // - Wishlist: BE tự gỡ sách vừa mua khỏi wishlist
    simulatePayment: build.mutation<OrderDetail, number>({
      query: (id) => ({ url: `/payments/${id}/simulate`, method: 'POST' }),
      invalidatesTags: ['Order', 'Ebook', 'OwnedBooks', 'Wishlist'],
    }),

    // GET /orders?status&page&limit → OrdersResult
    getOrders: build.query<OrdersResult, GetOrdersParams>({
      query: (params) => ({ url: '/orders', method: 'GET', params }),
      // baseApi đã unwrap envelope → resp là MẢNG OrderSummary[] trực tiếp (không bọc { orders })
      transformResponse: (resp: OrderSummary[], meta: EnvelopeMeta | undefined) => ({
        orders: resp ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map(({ code }) => ({ type: 'Order' as const, id: code })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderQuery,
  useCancelOrderMutation,
  useRecreatePaymentMutation,
  useSimulatePaymentMutation,
  useGetOrdersQuery,
} = ordersApi;
