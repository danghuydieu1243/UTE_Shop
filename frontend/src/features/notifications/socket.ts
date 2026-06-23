import { io, type Socket } from 'socket.io-client';
import { store } from '../../app/store';
import { notificationsApi, NOTIFICATIONS_LIST_ARGS } from './notificationsApi';
import type { NotificationRow } from './types';

let socket: Socket | null = null;

/** Xử lý 1 notification realtime: prepend vào cache list trang đầu + bump unread badge.
 *  Tách riêng (nhận dispatch) để test được mà không cần mở socket thật. */
export function handleIncomingNotification(
  n: NotificationRow,
  dispatch: typeof store.dispatch = store.dispatch,
): void {
  // Prepend vào cache list (trang đầu) nếu đang có; tăng unreadCount.
  // Dùng NOTIFICATIONS_LIST_ARGS chung với NotificationsPage để trúng đúng cache-key.
  dispatch(
    notificationsApi.util.updateQueryData('getNotifications', NOTIFICATIONS_LIST_ARGS, (draft) => {
      draft.notifications.unshift(n);
      draft.pagination.total += 1;
      draft.unreadCount += 1;
    }),
  );
  // Primitive number draft không mutatable — dùng invalidateTags để refetch unread badge
  dispatch(notificationsApi.util.invalidateTags([{ type: 'Notification', id: 'UNREAD' }]));
}

export function connectSocket(token: string): void {
  if (socket) return;
  // Dev: Vite proxy /socket.io → backend; prod cùng origin. auth gửi token.
  socket = io({ auth: { token }, autoConnect: true, transports: ['websocket', 'polling'] });

  socket.on('notification', (n: NotificationRow) => handleIncomingNotification(n));
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
