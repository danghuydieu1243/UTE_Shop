import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import { listNotificationsQuerySchema } from './notifications.schema';
import * as service from './notifications.service';

export const listNotifications = asyncHandler(async (req, res) => {
  const parsed = listNotificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) throw AppError.from('VALIDATION', 'Query không hợp lệ', parsed.error.issues);
  const { page, limit } = parsed.data;
  const { data, pagination, unreadCount } = await service.listNotifications(req.user!.id, page, limit);
  ok(res, data, { pagination, unreadCount });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await service.getUnreadCount(req.user!.id);
  ok(res, { unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw AppError.from('VALIDATION', 'ID không hợp lệ');
  await service.markRead(req.user!.id, id);
  ok(res, { success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user!.id);
  ok(res, { success: true });
});
