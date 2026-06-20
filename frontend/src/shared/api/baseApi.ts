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

const rawBaseQuery: BaseQueryFn<QueryArgs, unknown, ApiError & { status?: number }> = async (
  { url, method, data, params },
  apiCtx,
) => {
  const token = (apiCtx.getState() as RootState).auth.accessToken;
  try {
    const res = await api({
      url,
      method: method ?? 'GET',
      data,
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    // Backend bọc envelope {success,data}; trả phần data cho RTK Query.
    return { data: res.data?.data ?? res.data };
  } catch (e) {
    const err = e as AxiosError<{ error?: ApiError }>;
    const status = err.response?.status;
    const payload = err.response?.data?.error ?? { code: 'NETWORK', message: 'Không thể kết nối máy chủ' };
    return { error: { ...payload, status } };
  }
};

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

const baseQueryWithReauth: typeof rawBaseQuery = async (args, apiCtx, extra) => {
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
  tagTypes: ['Me'],
  endpoints: () => ({}),
});
