import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { api } from './axios';
import { setTokens, clearCredentials } from '../auth/authSlice';
import type { RootState } from '../../app/store';
import type { ApiError } from '../types/auth';

interface QueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: unknown;
}

/** Pagination shape mirrored from catalog/types — defined here to avoid a layering cycle. */
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Meta object forwarded from the backend envelope to RTK Query transformResponse. */
export interface EnvelopeMeta {
  pagination?: PaginationMeta;
}

const rawBaseQuery: BaseQueryFn<
  QueryArgs,
  unknown,
  ApiError & { status?: number },
  {},
  EnvelopeMeta
> = async (
  { url, method, data, params },
  apiCtx,
) => {
  const token = (apiCtx.getState() as RootState).auth.accessToken;
  try {
    // When data is FormData, let the browser set Content-Type (multipart + boundary).
    // Set Content-Type to undefined so axios removes it entirely and the browser
    // can inject the correct multipart/form-data header with the boundary parameter.
    // An empty string '' is NOT reliably stripped across axios versions, so we use
    // undefined here. Plain JSON requests are completely unaffected.
    const isFormData = data instanceof FormData;
    const res = await api({
      url,
      method: method ?? 'GET',
      data,
      params,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? { 'Content-Type': undefined } : {}),
      },
      transformRequest: isFormData
        ? [(d) => d]  // skip JSON serialisation — send FormData as-is
        : undefined,
    });
    // Backend bọc envelope {success,data,meta}; trả data + meta cho RTK Query.
    // transformResponse nhận meta làm tham số thứ 2 (dùng cho catalog pagination).
    return { data: res.data?.data ?? res.data, meta: res.data?.meta };
  } catch (e) {
    const err = e as AxiosError<{ error?: ApiError }>;
    const status = err.response?.status;
    const payload = err.response?.data?.error ?? { code: 'NETWORK', message: 'Không thể kết nối máy chủ' };
    return { error: { ...payload, status } };
  }
};

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  QueryArgs,
  unknown,
  ApiError & { status?: number },
  {},
  EnvelopeMeta
> = async (args, apiCtx, extra) => {
  let result = await rawBaseQuery(args, apiCtx, extra);
  if (result.error?.status === 401) {
    const state = apiCtx.getState() as RootState;
    const refreshToken = state.auth.refreshToken;
    if (!refreshToken) {
      apiCtx.dispatch(clearCredentials());
      return result;
    }
    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh', { refreshToken })
          .then((r) => r.data.data as { accessToken: string; refreshToken: string });
      }
      const tokens = await refreshPromise;
      refreshPromise = null;
      apiCtx.dispatch(setTokens(tokens));
      result = await rawBaseQuery(args, apiCtx, extra); // retry với token mới
    } catch {
      refreshPromise = null;
      apiCtx.dispatch(clearCredentials());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Book', 'VendorBook', 'Categories', 'Cart', 'Order', 'Ebook', 'Wishlist'],
  endpoints: () => ({}),
});
