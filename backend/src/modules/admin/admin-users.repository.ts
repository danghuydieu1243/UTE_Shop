import { Op, WhereOptions } from 'sequelize';
import { User } from '../../db/models';
import { AdminUserDTO, PaginationMeta, UserStatsMeta } from './admin.schema';

export function mapAdminUserDTO(user: User): AdminUserDTO {
  return {
    id: Number(user.id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    phone: user.phone ?? null,
    createdAt: user.created_at,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** Build the base WHERE clause (shared between paginated query and stats counts). */
function buildWhere(opts: {
  search?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
}): WhereOptions<any> {
  const where: WhereOptions<any> = {};

  if (opts.search) {
    where[Op.or as any] = [
      { email: { [Op.like]: `%${opts.search}%` } },
      { fullName: { [Op.like]: `%${opts.search}%` } },
    ];
  }
  if (opts.role) where['role'] = opts.role;
  if (opts.status) where['status'] = opts.status;

  if (opts.from || opts.to) {
    const range: any = {};
    if (opts.from) range[Op.gte] = new Date(opts.from);
    if (opts.to) range[Op.lte] = new Date(opts.to);
    where['created_at'] = range;
  }

  return where;
}

export async function listUsers(opts: {
  search?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}): Promise<{ rows: User[]; count: number }> {
  const where = buildWhere(opts);

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: ['id', 'email', 'fullName', 'role', 'status', 'phone', 'created_at', 'emailVerifiedAt'],
    order: [['created_at', 'DESC']],
    limit: opts.limit,
    offset: (opts.page - 1) * opts.limit,
  });

  return { rows, count };
}

/**
 * Count active / locked / pending users matching the same filters as listUsers
 * (excluding pagination).  Uses three separate User.count calls so it works
 * on both SQLite (tests) and MySQL (production) without dialect-specific GROUP BY.
 */
export async function countUserStats(opts: {
  search?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<UserStatsMeta> {
  // The base where clause already applies the status filter (if any).
  // When a status filter is active the "other" statuses will return 0, which
  // is the correct behaviour: counts are scoped to the current filter set.
  const baseWhere = buildWhere(opts);

  const [active, locked, pending] = await Promise.all([
    User.count({ where: { ...baseWhere, status: 'active' } }),
    User.count({ where: { ...baseWhere, status: 'locked' } }),
    User.count({ where: { ...baseWhere, status: 'pending' } }),
  ]);

  return { total: active + locked + pending, active, locked, pending };
}

export async function findUserById(id: number): Promise<User | null> {
  return User.findByPk(id, {
    attributes: ['id', 'email', 'fullName', 'role', 'status', 'phone', 'created_at', 'emailVerifiedAt'],
  });
}

export async function setUserStatus(id: number, status: 'active' | 'locked'): Promise<void> {
  await User.update({ status }, { where: { id } });
}
