import { baseApi } from '../../shared/api/baseApi';
import type { Cart } from './types';

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /cart — lấy toàn bộ giỏ hàng
    getCart: build.query<Cart, void>({
      query: () => ({ url: '/cart', method: 'GET' }),
      providesTags: ['Cart'],
    }),

    // POST /cart/items — thêm sách vào giỏ
    addToCart: build.mutation<Cart, { bookId: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', data: body }),
      invalidatesTags: ['Cart'],
    }),

    // DELETE /cart/items/:bookId — xóa một sách khỏi giỏ
    removeFromCart: build.mutation<Cart, { bookId: number }>({
      query: ({ bookId }) => ({ url: `/cart/items/${bookId}`, method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),

    // DELETE /cart — xóa toàn bộ giỏ hàng
    clearCart: build.mutation<Cart, void>({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} = cartApi;
