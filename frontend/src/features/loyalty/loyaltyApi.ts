import { baseApi } from '../../shared/api/baseApi';

export interface LoyaltyTransaction {
  id: number;
  type: string;
  points: number;
  note: string | null;
  createdAt: string;
}

export interface LoyaltyBalance {
  balance: number;
  transactions: LoyaltyTransaction[];
}

export const loyaltyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /me/loyalty — lấy số dư điểm thưởng
    getLoyalty: build.query<LoyaltyBalance, void>({
      query: () => ({ url: '/me/loyalty', method: 'GET' }),
    }),
  }),
});

export const { useGetLoyaltyQuery } = loyaltyApi;
