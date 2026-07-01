import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/* ── Mock axios instance dùng bởi baseApi.rawBaseQuery ── */
const mockApi = vi.fn();
vi.mock('../../../shared/api/axios', () => ({
  api: (...args: unknown[]) => mockApi(...args),
}));

import { baseApi } from '../../../shared/api/baseApi';
import { reviewsApi } from '../reviewsApi';
import authReducer from '../../../shared/auth/authSlice';

/* Trả về envelope {data, meta} như backend, cho page bất kỳ */
const envelope = (reviews: unknown[], total: number, page: number) => ({
  data: {
    success: true,
    data: reviews,
    meta: { pagination: { page, limit: 10, total, totalPages: Math.ceil(total / 10) } },
  },
});

const makeReview = (id: number) => ({
  id,
  userId: id,
  rating: 5,
  comment: `c${id}`,
  userName: `U${id}`,
  createdAt: '',
  vendorReply: null,
  vendorRepliedAt: null,
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

describe('reviewsApi getBookReviews merge (regression: không lặp khi refetch)', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  it('refetch page 1 (do invalidation) THAY THẾ danh sách, không nối chồng gây lặp', async () => {
    const store = makeStore();
    const page1 = [makeReview(1), makeReview(2), makeReview(3)];
    mockApi.mockResolvedValue(envelope(page1, 3, 1));

    // Fetch lần đầu
    await store.dispatch(
      reviewsApi.endpoints.getBookReviews.initiate({ idOrSlug: 'x', page: 1, limit: 10 }),
    );

    // Refetch cùng args (mô phỏng invalidatesTags sau khi tạo/sửa đánh giá)
    await store.dispatch(
      reviewsApi.endpoints.getBookReviews.initiate(
        { idOrSlug: 'x', page: 1, limit: 10 },
        { forceRefetch: true },
      ),
    );

    const state = store.getState();
    const entry = reviewsApi.endpoints.getBookReviews.select({ idOrSlug: 'x', page: 1, limit: 10 })(
      state as never,
    );
    expect(entry.data?.reviews).toHaveLength(3); // KHÔNG phải 6
  });

  it('tải thêm page 2 nối tiếp và dedupe theo id', async () => {
    const store = makeStore();
    mockApi.mockResolvedValueOnce(envelope([makeReview(1), makeReview(2)], 4, 1));
    await store.dispatch(
      reviewsApi.endpoints.getBookReviews.initiate({ idOrSlug: 'y', page: 1, limit: 10 }),
    );

    mockApi.mockResolvedValueOnce(envelope([makeReview(3), makeReview(4)], 4, 2));
    await store.dispatch(
      reviewsApi.endpoints.getBookReviews.initiate({ idOrSlug: 'y', page: 2, limit: 10 }),
    );

    const entry = reviewsApi.endpoints.getBookReviews.select({ idOrSlug: 'y', page: 2, limit: 10 })(
      store.getState() as never,
    );
    expect(entry.data?.reviews.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });
});
