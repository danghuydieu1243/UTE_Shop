import { baseApi } from '../../shared/api/baseApi';
import type { User } from '../../shared/types/auth';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateProfile: build.mutation<User, { fullName?: string; phone?: string }>({
      query: (data) => ({ url: '/users/me', method: 'PATCH', data }),
      invalidatesTags: ['Me'],
    }),
    changePassword: build.mutation<{ success: boolean }, { currentPassword: string; newPassword: string }>({
      query: (data) => ({ url: '/users/me/change-password', method: 'POST', data }),
    }),
  }),
});

export const { useUpdateProfileMutation, useChangePasswordMutation } = profileApi;
