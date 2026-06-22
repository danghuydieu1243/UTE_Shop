import { AppError } from '../../shared/errors/AppError';
import * as repo from './admin-users.repository';
import { ListUsersQuery, PatchUserStatusBody, AdminUserDTO, PaginationMeta, UserStatsMeta } from './admin.schema';

export async function listUsers(
  q: ListUsersQuery,
): Promise<{ data: AdminUserDTO[]; pagination: PaginationMeta; stats: UserStatsMeta }> {
  const filterOpts = {
    search: q.search,
    role: q.role,
    status: q.status,
    from: q.from,
    to: q.to,
  };

  const [{ rows, count }, stats] = await Promise.all([
    repo.listUsers({ ...filterOpts, page: q.page, limit: q.limit }),
    repo.countUserStats(filterOpts),
  ]);

  return {
    data: rows.map(repo.mapAdminUserDTO),
    pagination: repo.buildPaginationMeta(q.page, q.limit, count),
    stats,
  };
}

export async function updateUserStatus(
  targetId: number,
  callerId: number,
  body: PatchUserStatusBody,
): Promise<AdminUserDTO> {
  // Cannot lock self
  if (targetId === callerId) {
    throw AppError.from('ADMIN_CANNOT_LOCK_SELF', 'Không thể tự khóa tài khoản của mình');
  }

  const target = await repo.findUserById(targetId);
  if (!target) {
    throw AppError.from('NOT_FOUND', 'Người dùng không tồn tại');
  }

  // Cannot lock another admin
  if (target.role === 'admin') {
    throw AppError.from('FORBIDDEN', 'Không thể thay đổi trạng thái tài khoản admin khác');
  }

  await repo.setUserStatus(targetId, body.status);

  // Re-fetch to get updated state
  const updated = await repo.findUserById(targetId);
  return repo.mapAdminUserDTO(updated!);
}
