/**
 * socket handleIncomingNotification — realtime cache patch.
 * Test trực tiếp handler (không mở socket thật): seed cache getNotifications trang đầu,
 * bắn 1 notification → list được prepend + unreadCount/total tăng.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import { notificationsApi, NOTIFICATIONS_LIST_ARGS } from '../notificationsApi';
import { handleIncomingNotification } from '../socket';
import type { NotificationRow } from '../types';

const { enqueueNotificationToast } = vi.hoisted(() => ({
  enqueueNotificationToast: vi.fn(),
}));

vi.mock('../toastBus', () => ({
  enqueueNotificationToast,
}));

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const EXISTING: NotificationRow = {
  id: 1, type: 'order', title: 'cũ', body: null, data: null,
  readAt: '2026-06-23T07:00:00.000Z', createdAt: '2026-06-23T07:00:00.000Z',
};
const INCOMING: NotificationRow = {
  id: 2, type: 'ebook', title: 'mới', body: 'x', data: { orderCode: 'ATHENA1' },
  readAt: null, createdAt: '2026-06-23T08:00:00.000Z',
};

describe('handleIncomingNotification', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(async () => {
    store = makeStore();
    // Seed cache list trang đầu với 1 item + unreadCount=0 (upsert là thunk async → await)
    await store.dispatch(
      notificationsApi.util.upsertQueryData('getNotifications', NOTIFICATIONS_LIST_ARGS, {
        notifications: [EXISTING],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        unreadCount: 0,
      }),
    );
  });

  it('prepend notification mới vào đầu list + tăng total & unreadCount', () => {
    handleIncomingNotification(INCOMING, store.dispatch);
    const entry = notificationsApi.endpoints.getNotifications.select(NOTIFICATIONS_LIST_ARGS)(
      store.getState() as never,
    );
    expect(entry.data!.notifications[0].id).toBe(2); // mới đứng đầu
    expect(entry.data!.notifications).toHaveLength(2);
    expect(entry.data!.pagination.total).toBe(2);
    expect(entry.data!.unreadCount).toBe(1);
  });

  it('enqueue toast để hiện thông báo nổi cho user', () => {
    handleIncomingNotification(INCOMING, store.dispatch);
    expect(enqueueNotificationToast).toHaveBeenCalledWith(INCOMING);
  });
});
