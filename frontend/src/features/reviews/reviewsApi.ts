// API endpoints cho đánh giá sách (Phase 4)
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type {
  ReviewDTO,
  GetBookReviewsParams,
  GetBookReviewsResult,
  CreateReviewBody,
} from './types';

const reviewsApi = baseApi.injectEndpoints({
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
      // Merge pages khi tải thêm
      serializeQueryArgs: ({ queryArgs }) => queryArgs.idOrSlug,
      merge: (currentCache, newItems) => {
        currentCache.reviews.push(...newItems.reviews);
        currentCache.pagination = newItems.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
      providesTags: (_result, _error, { idOrSlug }) => [
        { type: 'Review' as const, id: idOrSlug },
        { type: 'Review' as const, id: 'LIST' },
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
        { type: 'Book' as const, id: String(arg.idOrSlug) },
        { type: 'Book' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetBookReviewsQuery, useCreateReviewMutation } = reviewsApi;
