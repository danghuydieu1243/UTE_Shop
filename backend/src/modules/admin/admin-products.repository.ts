import { Op, WhereOptions, where, col } from 'sequelize';
import { Book, Author, User, Vendor } from '../../db/models';
import { AdminProductDTO, PaginationMeta } from './admin.schema';
import { buildPaginationMeta } from './admin-vendors.repository';

// ─── Mapper ─────────────────────────────────────────────────────────────────

export async function mapAdminProductDTO(book: Book): Promise<AdminProductDTO> {
  const author = (book as any).author as Author | null | undefined;
  const vendorUser = (book as any).vendor as (User & { vendor?: Vendor }) | undefined;
  const shopName = (vendorUser as any)?.vendor?.shopName ?? vendorUser?.fullName ?? '';

  return {
    id: Number(book.id),
    title: book.title,
    slug: book.slug ?? null,
    vendorShop: shopName,
    authorName: author?.name ?? null,
    price: Number(book.price),
    status: book.status ?? 'draft',
    fileFormat: book.fileFormat,
    createdAt: book.created_at ?? new Date(),
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listAdminProducts(opts: {
  search?: string;
  vendorUserId?: number;
  status?: string;
  page: number;
  limit: number;
}): Promise<{ rows: Book[]; count: number }> {
  const bookWhere: WhereOptions<any> = {};

  if (opts.status) {
    bookWhere['status'] = opts.status;
  }

  if (opts.vendorUserId !== undefined) {
    bookWhere['vendorUserId'] = opts.vendorUserId;
  }

  if (opts.search) {
    bookWhere[Op.or as any] = [
      { title: { [Op.like]: `%${opts.search}%` } },
      where(col('author.name'), { [Op.like]: `%${opts.search}%` }),
    ];
  }

  const { rows, count } = await Book.findAndCountAll({
    where: bookWhere,
    include: [
      {
        model: Author,
        as: 'author',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: User,
        as: 'vendor',
        attributes: ['id', 'fullName', 'email'],
        required: false,
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['shopName', 'shopSlug'],
            required: false,
          },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: opts.limit,
    offset: (opts.page - 1) * opts.limit,
    distinct: true,
  });

  return { rows, count };
}

export async function findAdminProductById(id: number): Promise<Book | null> {
  return Book.findByPk(id, {
    include: [
      {
        model: Author,
        as: 'author',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: User,
        as: 'vendor',
        attributes: ['id', 'fullName', 'email'],
        required: false,
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['shopName', 'shopSlug'],
            required: false,
          },
        ],
      },
    ],
  });
}

export async function setProductStatus(id: number, status: 'published' | 'hidden'): Promise<void> {
  await Book.update({ status }, { where: { id } });
}

export { buildPaginationMeta };
