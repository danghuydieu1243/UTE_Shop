import { Op, WhereOptions, Transaction, where, col } from 'sequelize';
import { User, Vendor, Book } from '../../db/models';
import { AdminVendorDTO, PaginationMeta } from './admin.schema';

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function mapAdminVendorDTO(vendor: Vendor): Promise<AdminVendorDTO> {
  const owner = (vendor as any).user as User;
  const bookCount = await Book.count({
    where: { vendorUserId: vendor.userId, status: 'published' },
  });

  return {
    userId: Number(vendor.userId),
    shopName: vendor.shopName,
    shopSlug: vendor.shopSlug ?? null,
    ownerName: owner.fullName,
    ownerEmail: owner.email,
    status: vendor.status,
    bookCount,
    createdAt: vendor.created_at,
  };
}

export async function listVendors(opts: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}): Promise<{ rows: Vendor[]; count: number }> {
  const vendorWhere: WhereOptions<any> = {};
  const userWhere: WhereOptions<any> = {};

  if (opts.status) vendorWhere['status'] = opts.status;

  if (opts.from || opts.to) {
    const range: any = {};
    if (opts.from) range[Op.gte] = new Date(opts.from);
    if (opts.to) range[Op.lte] = new Date(opts.to);
    vendorWhere['created_at'] = range;
  }

  if (opts.search) {
    // search in both shop_name and owner email — dialect-neutral, bound params
    vendorWhere[Op.or as any] = [
      { shopName: { [Op.like]: `%${opts.search}%` } },
      where(col('user.email'), { [Op.like]: `%${opts.search}%` }),
    ];
  }

  const { rows, count } = await Vendor.findAndCountAll({
    where: vendorWhere,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'fullName', 'status'],
        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        required: true,
      },
    ],
    order: [['created_at', 'DESC']],
    limit: opts.limit,
    offset: (opts.page - 1) * opts.limit,
    distinct: true,
  });

  return { rows, count };
}

export async function findVendorById(vendorUserId: number): Promise<Vendor | null> {
  return Vendor.findOne({
    where: { userId: vendorUserId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'fullName', 'status'],
      },
    ],
  });
}

export async function setVendorAndUserStatus(
  vendorUserId: number,
  status: 'active' | 'locked',
  t: Transaction,
): Promise<void> {
  await Vendor.update({ status }, { where: { userId: vendorUserId }, transaction: t });
  await User.update({ status }, { where: { id: vendorUserId }, transaction: t });
}
