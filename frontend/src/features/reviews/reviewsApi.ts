// API endpoints cho đánh giá sách (Phase 4)
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type {
  ReviewDTO,
  GetBookReviewsParams,
  GetBookReviewsResult,
  CreateReviewBody,
  UpdateReviewBody,
} from './types';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /books/:idOrSlug/reviews?page=&limit= — PUBLIC
    getBookReviews: build.query<GetBookReviewsResult, GetBookReviewsParams>({
      query: ({ idOrSlug, page, limit }) => ({
        url: `/books/${idOrSlug}/reviews`,
        method: 'GET',
        params: { page, limit },
      }),
      // baseApi unwraps envelope: resp = ReviewDTO[] trực tiếp (KHÔNG phải resp.reviews)
      transformResponse: (resp: ReviewDTO[], meta: EnvelopeMeta | undefined) => ({
        reviews: resp ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
      // Merge pages khi tải thêm.
      // LƯU Ý: merge cũng chạy khi refetch (do invalidatesTags sau khi tạo/sửa
      // đánh giá) → nếu chỉ push sẽ nối chồng gây LẶP danh sách. Vì vậy:
      //  - page 1 (fetch lại từ đầu): thay thế toàn bộ.
      //  - page > 1 (tải thêm): nối tiếp nhưng dedupe theo id.
      serializeQueryArgs: ({ queryArgs }) => queryArgs.idOrSlug,
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === undefined || arg.page <= 1) {
          currentCache.reviews = newItems.reviews;
        } else {
          const seen = new Set(currentCache.reviews.map((r) => r.id));
          currentCache.reviews.push(...newItems.reviews.filter((r) => !seen.has(r.id)));
        }
        currentCache.pagination = newItems.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
      providesTags: (_result, _error, { idOrSlug }) => [
        { type: 'Review' as const, id: idOrSlug },
        { type: 'Review' as const, id: 'LIST' },
      ],
    }),

    // GET /me/reviews/:bookId — requireRole('user') — đánh giá của chính user (hoặc null)
    getMyReview: build.query<ReviewDTO | null, { bookId: number }>({
      query: ({ bookId }) => ({
        url: `/me/reviews/${bookId}`,
        method: 'GET',
      }),
      // baseApi unwraps envelope: resp = ReviewDTO | null trực tiếp
      transformResponse: (resp: ReviewDTO | null) => resp ?? null,
      providesTags: (_result, _error, { bookId }) => [
        { type: 'Review' as const, id: `MINE-${bookId}` },
      ],
    }),

    // POST /me/reviews — requireRole('user')
    createReview: build.mutation<ReviewDTO, CreateReviewBody>({
      query: ({ idOrSlug: _idOrSlug, ...body }) => ({
        url: '/me/reviews',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Review' as const, id: 'LIST' },
        { type: 'Review' as const, id: `MINE-${arg.bookId}` },
        { type: 'Book' as const, id: String(arg.idOrSlug) },
        { type: 'Book' as const, id: 'LIST' },
      ],
    }),

    // PATCH /me/reviews/:bookId — requireRole('user') — sửa đánh giá đã có
    updateReview: build.mutation<ReviewDTO, UpdateReviewBody>({
      query: ({ bookId, idOrSlug: _idOrSlug, ...body }) => ({
        url: `/me/reviews/${bookId}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Review' as const, id: 'LIST' },
        { type: 'Review' as const, id: `MINE-${arg.bookId}` },
        { type: 'Book' as const, id: String(arg.idOrSlug) },
        { type: 'Book' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetBookReviewsQuery,
  useGetMyReviewQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
} = reviewsApi;
