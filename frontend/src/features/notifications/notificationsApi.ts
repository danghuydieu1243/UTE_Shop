import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { NotificationRow } from './types';

export interface NotificationsResult {
  notifications: NotificationRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unreadCount: number;
}

export interface NotificationsParams {
  page?: number;
  limit?: number;
}

/** Args canonical cho list trang đầu — dùng chung giữa NotificationsPage và socket cache-patch
 *  để tránh lệch cache-key (realtime prepend phải trúng đúng entry trang đang xem). */
export const NOTIFICATIONS_LIST_ARGS: NotificationsParams = { page: 1, limit: 20 };

export const transformNotificationsResponse = (
  resp: NotificationRow[],
  meta: EnvelopeMeta | undefined,
): NotificationsResult => ({
  notifications: Array.isArray(resp) ? resp : [],
  pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  unreadCount: meta?.unreadCount ?? 0,
});

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationsResult, NotificationsParams>({
      query: (params) => ({ url: '/user/notifications', method: 'GET', params }),
      transformResponse: transformNotificationsResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    getUnreadCount: build.query<number, void>({
      query: () => ({ url: '/user/notifications/unread-count', method: 'GET' }),
      transformResponse: (resp: { unreadCount: number }) => resp?.unreadCount ?? 0,
      providesTags: [{ type: 'Notification' as const, id: 'UNREAD' }],
    }),
    markRead: build.mutation<void, number>({
      query: (id) => ({ url: `/user/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Notification' as const, id },
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD' },
      ],
    }),
    markAllRead: build.mutation<void, void>({
      query: () => ({ url: '/user/notifications/read-all', method: 'PUT' }),
      invalidatesTags: [
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
