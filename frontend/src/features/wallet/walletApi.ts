/** walletApi — RTK Query endpoints cho Vendor Wallet (Phase 6c). */
import { baseApi, type EnvelopeMeta } from '../../shared/api/baseApi';
import type { WalletData, WithdrawalDTO, CreateWithdrawalInput } from './types';

/** Raw shape as received from baseApi (envelope already unwrapped: data = object without pagination). */
interface WalletRaw {
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  monthlySeries: Array<{ month: string; value: number }>;
  transactions: Array<{
    id: number;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  }>;
}

/** Exported so tests can verify through-transform behaviour (camelCase, arrays, pagination). */
export function transformWalletResponse(data: WalletRaw, meta: EnvelopeMeta): WalletData {
  return {
    availableBalance: data.availableBalance,
    pendingBalance: data.pendingBalance,
    totalWithdrawn: data.totalWithdrawn,
    monthlySeries: Array.isArray(data.monthlySeries) ? data.monthlySeries : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
  };
}

export const walletApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletData, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 10 } = {}) => ({
        url: '/vendor/wallet',
        method: 'GET',
        params: { page, limit },
      }),
      transformResponse: (data: WalletRaw, meta: EnvelopeMeta) =>
        transformWalletResponse(data, meta),
      providesTags: ['Wallet'],
    }),

    createWithdrawal: build.mutation<WithdrawalDTO, CreateWithdrawalInput>({
      query: (body) => ({
        url: '/vendor/withdrawals',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Wallet'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetWalletQuery, useCreateWithdrawalMutation } = walletApi;
