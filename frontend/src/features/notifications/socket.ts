import { io, type Socket } from 'socket.io-client';
import { store } from '../../app/store';
import { notificationsApi } from './notificationsApi';
import type { NotificationRow } from './types';

let socket: Socket | null = null;

export function connectSocket(token: string): void {
  if (socket) return;
  // Dev: Vite proxy /socket.io → backend; prod cùng origin. auth gửi token.
  socket = io({ auth: { token }, autoConnect: true, transports: ['websocket', 'polling'] });

  socket.on('notification', (n: NotificationRow) => {
    // Prepend vào cache list (trang đầu) nếu đang có; tăng unreadCount
    store.dispatch(
      notificationsApi.util.updateQueryData('getNotifications', { page: 1, limit: 20 }, (draft) => {
        draft.notifications.unshift(n);
        draft.pagination.total += 1;
        draft.unreadCount += 1;
      }),
    );
    // Primitive number draft không mutatable — dùng invalidateTags để refetch unread badge
    store.dispatch(notificationsApi.util.invalidateTags([{ type: 'Notification', id: 'UNREAD' }]));
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
