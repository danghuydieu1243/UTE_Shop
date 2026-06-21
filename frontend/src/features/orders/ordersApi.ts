import { baseApi } from '../../shared/api/baseApi';
import type { OrderDetail, Payment } from './types';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // POST /orders — tạo đơn hàng từ giỏ hàng hiện tại
    createOrder: build.mutation<OrderDetail, void>({
      query: () => ({ url: '/orders', method: 'POST', data: {} }),
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
      invalidatesTags: (_result, _err, code) => [{ type: 'Order' as const, id: code }],
    }),

    // POST /orders/:code/payment — tạo lại QR payment
    recreatePayment: build.mutation<Payment, string>({
      query: (code) => ({ url: `/orders/${code}/payment`, method: 'POST' }),
      invalidatesTags: (_result, _err, code) => [{ type: 'Order' as const, id: code }],
    }),

    // POST /payments/:id/simulate — giả lập thanh toán thành công
    simulatePayment: build.mutation<OrderDetail, number>({
      query: (id) => ({ url: `/payments/${id}/simulate`, method: 'POST' }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderQuery,
  useCancelOrderMutation,
  useRecreatePaymentMutation,
  useSimulatePaymentMutation,
} = ordersApi;
