import { baseApi } from '../../shared/api/baseApi';
import { setCredentials } from '../../shared/auth/authSlice';
import type { User } from '../../shared/types/auth';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  redirect: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<
      { email: string; otpExpiresAt: string; purpose: string },
      { accountType: 'user' | 'vendor'; email: string; password: string; fullName: string; shopName?: string }
    >({
      query: (data) => ({ url: '/auth/register', method: 'POST', data }),
    }),
    verifyOtp: build.mutation<
      AuthResult | { resetToken: string },
      { email: string; purpose: 'register' | 'reset_password'; code: string }
    >({
      query: (data) => ({ url: '/auth/verify-otp', method: 'POST', data }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          if ('accessToken' in data && 'user' in data) {
            dispatch(setCredentials({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }));
          }
        } catch {
          /* lỗi xử lý ở component */
        }
      },
    }),
    resendOtp: build.mutation<
      { otpExpiresAt: string; resendAvailableAt: string },
      { email: string; purpose: 'register' | 'reset_password' }
    >({
      query: (data) => ({ url: '/auth/resend-otp', method: 'POST', data }),
    }),
    login: build.mutation<AuthResult, { email: string; password: string }>({
      query: (data) => ({ url: '/auth/login', method: 'POST', data }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }));
        } catch {
          /* */
        }
      },
    }),
    logout: build.mutation<void, { refreshToken: string }>({
      query: (data) => ({ url: '/auth/logout', method: 'POST', data }),
    }),
    forgotPassword: build.mutation<{ message: string }, { email: string }>({
      query: (data) => ({ url: '/auth/forgot-password', method: 'POST', data }),
    }),
    resetPassword: build.mutation<
      { success: boolean },
      { email: string; resetToken: string; newPassword: string }
    >({
      query: (data) => ({ url: '/auth/reset-password', method: 'POST', data }),
    }),
    getMe: build.query<User, void>({
      query: () => ({ url: '/auth/me', method: 'GET' }),
      providesTags: ['Me'],
    }),
  }),
});

export const {
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
} = authApi;
