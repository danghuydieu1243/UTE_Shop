// Through-transform test cho getOwnedBookIds.
// Mock lớp axios (KHÔNG mock hook) để chạy thật transformResponse, đảm bảo
// shape/casing khớp envelope BE: { success, data: { bookIds: number[] } }.
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/* ── Mock axios instance mà baseApi dùng ── */
const mockApi = vi.fn();
vi.mock('../../../shared/api/axios', () => ({
  api: (...args: unknown[]) => mockApi(...args),
}));

import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import '../libraryApi'; // inject endpoint getOwnedBookIds

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });

// endpoints được inject → truy cập qua baseApi.endpoints
const getOwnedBookIds = (baseApi.endpoints as any).getOwnedBookIds;

describe('getOwnedBookIds — through transformResponse', () => {
  beforeEach(() => mockApi.mockReset());

  it('unwrap envelope { data: { bookIds } } → number[]', async () => {
    // BE trả envelope; baseQuery unwrap res.data.data → { bookIds: [...] }
    mockApi.mockResolvedValue({ data: { success: true, data: { bookIds: [1, 2, 3] } } });

    const store = makeStore();
    const res = await store.dispatch(getOwnedBookIds.initiate());

    expect(res.data).toEqual([1, 2, 3]);
    // Gọi đúng endpoint
    expect(mockApi).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/me/ebooks/ids', method: 'GET' }),
    );
  });

  it('bookIds rỗng → mảng rỗng (không undefined)', async () => {
    mockApi.mockResolvedValue({ data: { success: true, data: { bookIds: [] } } });

    const store = makeStore();
    const res = await store.dispatch(getOwnedBookIds.initiate());

    expect(res.data).toEqual([]);
  });
});
