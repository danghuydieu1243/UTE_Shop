import { Op, WhereOptions } from 'sequelize';
import { User } from '../../db/models';
import { AdminUserDTO, PaginationMeta } from './admin.schema';

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

export async function listUsers(opts: {
  search?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}): Promise<{ rows: User[]; count: number }> {
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

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: ['id', 'email', 'fullName', 'role', 'status', 'phone', 'created_at', 'emailVerifiedAt'],
    order: [['created_at', 'DESC']],
    limit: opts.limit,
    offset: (opts.page - 1) * opts.limit,
  });

  return { rows, count };
}

export async function findUserById(id: number): Promise<User | null> {
  return User.findByPk(id, {
    attributes: ['id', 'email', 'fullName', 'role', 'status', 'phone', 'created_at', 'emailVerifiedAt'],
  });
}

export async function setUserStatus(id: number, status: 'active' | 'locked'): Promise<void> {
  await User.update({ status }, { where: { id } });
}
