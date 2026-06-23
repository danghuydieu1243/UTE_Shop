import { Transaction } from 'sequelize';
import { Notification } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './notifications.repository';
import { NotificationDTO } from './notifications.schema';

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  data?: object | null;
}

// T1: chỉ INSERT + map. T2 sẽ bổ sung emit socket sau commit.
export async function createNotification(
  input: CreateNotificationInput,
  opts?: { transaction?: Transaction },
): Promise<NotificationDTO> {
  const row = await Notification.create(
    {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    },
    opts?.transaction ? { transaction: opts.transaction } : {},
  );
  return repo.mapNotificationDTO(row);
}

export async function listNotifications(userId: number, page: number, limit: number) {
  const { rows, count } = await repo.listByUser(userId, page, limit);
  const unreadCount = await repo.countUnread(userId);
  return {
    data: rows.map(repo.mapNotificationDTO),
    pagination: repo.buildPaginationMeta(page, limit, count),
    unreadCount,
  };
}

export async function getUnreadCount(userId: number): Promise<number> {
  return repo.countUnread(userId);
}

export async function markRead(userId: number, id: number): Promise<void> {
  const exists = await repo.existsForUser(userId, id);
  if (!exists) throw AppError.from('NOT_FOUND', 'Không tìm thấy thông báo');
  await repo.markOneRead(userId, id); // idempotent: đã đọc rồi vẫn OK
}

export async function markAllRead(userId: number): Promise<void> {
  await repo.markAllReadByUser(userId);
}
