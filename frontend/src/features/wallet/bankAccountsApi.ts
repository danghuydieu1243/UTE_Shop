/** bankAccountsApi — RTK Query endpoints cho Vendor Bank Accounts (Phase 6c). */
import { baseApi } from '../../shared/api/baseApi';
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from './types';

export const bankAccountsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBankAccounts: build.query<BankAccount[], void>({
      query: () => ({ url: '/vendor/bank-accounts', method: 'GET' }),
      providesTags: ['BankAccount'],
    }),

    createBankAccount: build.mutation<BankAccount, CreateBankAccountInput>({
      query: (body) => ({
        url: '/vendor/bank-accounts',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['BankAccount'],
    }),

    updateBankAccount: build.mutation<BankAccount, { id: number } & UpdateBankAccountInput>({
      query: ({ id, ...body }) => ({
        url: `/vendor/bank-accounts/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['BankAccount'],
    }),

    setDefaultBankAccount: build.mutation<BankAccount, number>({
      query: (id) => ({
        url: `/vendor/bank-accounts/${id}/default`,
        method: 'PATCH',
      }),
      invalidatesTags: ['BankAccount'],
    }),

    deleteBankAccount: build.mutation<null, number>({
      query: (id) => ({
        url: `/vendor/bank-accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BankAccount'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
  useUpdateBankAccountMutation,
  useSetDefaultBankAccountMutation,
  useDeleteBankAccountMutation,
} = bankAccountsApi;
