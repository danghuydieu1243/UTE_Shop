import { Notification } from '../../db/models';
import { NotificationDTO, PaginationMeta } from './notifications.schema';

export function mapNotificationDTO(n: Notification): NotificationDTO {
  return {
    id: Number(n.id),
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    data: (n.data as unknown) ?? null,
    readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
    createdAt: new Date(n.created_at).toISOString(),
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listByUser(userId: number, page: number, limit: number) {
  const { rows, count } = await Notification.findAndCountAll({
    where: { userId },
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { rows, count };
}

export async function countUnread(userId: number): Promise<number> {
  return Notification.count({ where: { userId, readAt: null } });
}

export async function markOneRead(userId: number, id: number): Promise<number> {
  const [affected] = await Notification.update(
    { readAt: new Date() },
    { where: { id, userId, readAt: null } },
  );
  // Trả số dòng đổi; 0 có thể do đã đọc rồi HOẶC không tồn tại/không phải chủ → controller xử lý tồn tại riêng.
  return affected;
}

export async function existsForUser(userId: number, id: number): Promise<boolean> {
  const n = await Notification.count({ where: { id, userId } });
  return n > 0;
}

export async function markAllReadByUser(userId: number): Promise<void> {
  await Notification.update({ readAt: new Date() }, { where: { userId, readAt: null } });
}
