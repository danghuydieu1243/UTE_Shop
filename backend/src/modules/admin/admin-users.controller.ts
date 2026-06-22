import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { listUsersQuerySchema, patchUserStatusBodySchema } from './admin.schema';
import * as service from './admin-users.service';

export const listUsers = asyncHandler(async (req, res) => {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { data, pagination, stats } = await service.listUsers(parsed.data);
  ok(res, data, { pagination, stats });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    throw AppError.from('VALIDATION', 'ID người dùng không hợp lệ');
  }

  const parsed = patchUserStatusBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', parsed.error.issues);
  }

  const callerId = req.user!.id;
  const dto = await service.updateUserStatus(targetId, callerId, parsed.data);
  ok(res, dto);
});
