import { Transaction } from 'sequelize';
import { Notification } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './notifications.repository';
import { NotificationDTO } from './notifications.schema';
import { emitToUser } from '../../shared/realtime/io';

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  data?: object | null;
}

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
  const dto = repo.mapNotificationDTO(row);
  const emit = () => emitToUser(input.userId, 'notification', dto);
  if (opts?.transaction) {
    opts.transaction.afterCommit(() => emit());
  } else {
    emit();
  }
  return dto;
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
  // Happy path 1 query: UPDATE WHERE id+userId+chưa đọc. affected=0 → phân biệt
  // "không tồn tại/không phải chủ" (404) với "đã đọc rồi" (idempotent, bỏ qua).
  const affected = await repo.markOneRead(userId, id);
  if (affected === 0) {
    const exists = await repo.existsForUser(userId, id);
    if (!exists) throw AppError.from('NOT_FOUND', 'Không tìm thấy thông báo');
    // else: đã đọc rồi → idempotent, không lỗi
  }
}

export async function markAllRead(userId: number): Promise<void> {
  await repo.markAllReadByUser(userId);
}
