export type NotificationType = 'order' | 'payment' | 'ebook' | 'promotion' | 'system';

export interface NotificationRow {
  id: number;
  type: NotificationType | string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
