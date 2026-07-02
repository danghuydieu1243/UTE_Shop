import type { NotificationRow } from './types';

type NotificationToastListener = (notification: NotificationRow) => void;

const listeners = new Set<NotificationToastListener>();

export function enqueueNotificationToast(notification: NotificationRow): void {
  listeners.forEach((listener) => listener(notification));
}

export function subscribeNotificationToast(listener: NotificationToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetNotificationToastBus(): void {
  listeners.clear();
}
