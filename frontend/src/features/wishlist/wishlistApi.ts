// API endpoints cho Wishlist — Screen 16
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { WishlistItem, WishlistResult, AddToWishlistBody } from './types';

const wishlistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /me/wishlist?page=&limit= — danh sách sách yêu thích
    getWishlist: build.query<WishlistResult, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/me/wishlist',
        method: 'GET',
        params,
      }),
      // baseApi unwraps envelope: resp = data array, meta.pagination từ envelope
      transformResponse: (resp: WishlistItem[], meta: EnvelopeMeta | undefined) => ({
        items: resp ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ book }) => ({
                type: 'Wishlist' as const,
                id: book.id,
              })),
              { type: 'Wishlist' as const, id: 'LIST' },
            ]
          : [{ type: 'Wishlist' as const, id: 'LIST' }],
    }),

    // POST /me/wishlist — thêm sách vào wishlist (idempotent)
    addToWishlist: build.mutation<WishlistItem, AddToWishlistBody>({
      query: (body) => ({
        url: '/me/wishlist',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: [{ type: 'Wishlist' as const, id: 'LIST' }],
    }),

    // DELETE /me/wishlist/:bookId — xóa sách khỏi wishlist (idempotent)
    removeFromWishlist: build.mutation<void, number>({
      query: (bookId) => ({
        url: `/me/wishlist/${bookId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, bookId) => [
        { type: 'Wishlist' as const, id: bookId },
        { type: 'Wishlist' as const, id: 'LIST' },
      ],
    }),

    // DELETE /me/wishlist — xóa toàn bộ wishlist (idempotent)
    clearWishlist: build.mutation<void, void>({
      query: () => ({
        url: '/me/wishlist',
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Wishlist' as const, id: 'LIST' }],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useClearWishlistMutation,
} = wishlistApi;
