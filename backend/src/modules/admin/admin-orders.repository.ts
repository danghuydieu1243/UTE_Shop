import { Op, WhereOptions, where, col } from 'sequelize';
import { Order, OrderItem, Payment, User, Vendor } from '../../db/models';
import {
  AdminOrderSummaryDTO,
  AdminOrderDetailDTO,
  AdminOrderItemDTO,
  AdminPaymentSummaryDTO,
  PaginationMeta,
} from './admin.schema';
import { buildPaginationMeta } from './admin-vendors.repository';

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapPaymentSummary(payment: Payment | null): AdminPaymentSummaryDTO | null {
  if (!payment) return null;
  return {
    status: payment.status ?? 'PENDING',
    amount: Number(payment.amount),
    expiresAt: payment.expiresAt ?? null,
  };
}

function mapOrderItemDTO(item: OrderItem): AdminOrderItemDTO {
  return {
    bookId: Number(item.bookId),
    titleSnapshot: item.titleSnapshot,
    unitPrice: Number(item.unitPrice),
  };
}

export function mapAdminOrderSummaryDTO(order: Order): AdminOrderSummaryDTO {
  const user = (order as any).user as User | undefined;
  const items = ((order as any).items as OrderItem[]) ?? [];
  const payments = ((order as any).payments as Payment[]) ?? [];

  // Latest payment by created_at
  const latestPayment =
    payments.length > 0
      ? payments.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )[0]
      : null;

  // vendor shops: unique shop names from items' vendor associations
  const vendorShops: string[] = [];
  for (const item of items) {
    const vendor = (item as any).vendor as User & { vendor?: Vendor } | undefined;
    const shopName = (vendor as any)?.vendor?.shopName;
    if (shopName && !vendorShops.includes(shopName)) {
      vendorShops.push(shopName);
    }
  }

  // itemsBrief: first item title + "+N more"
  let itemsBrief = '';
  if (items.length === 0) {
    itemsBrief = '(no items)';
  } else if (items.length === 1) {
    itemsBrief = items[0].titleSnapshot;
  } else {
    itemsBrief = `${items[0].titleSnapshot} +${items.length - 1} more`;
  }

  return {
    code: order.code,
    status: order.status ?? 'NEW',
    buyerName: user?.fullName ?? '',
    buyerEmail: user?.email ?? '',
    vendorShops,
    itemsBrief,
    total: Number(order.total),
    currency: order.currency ?? 'VND',
    paymentStatus: latestPayment?.status ?? null,
    createdAt: order.created_at ?? new Date(),
  };
}

export function mapAdminOrderDetailDTO(order: Order): AdminOrderDetailDTO {
  const items = ((order as any).items as OrderItem[]) ?? [];
  const payments = ((order as any).payments as Payment[]) ?? [];

  const latestPayment =
    payments.length > 0
      ? payments.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )[0]
      : null;

  return {
    code: order.code,
    status: order.status ?? 'NEW',
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    currency: order.currency ?? 'VND',
    items: items.map(mapOrderItemDTO),
    payment: mapPaymentSummary(latestPayment),
    createdAt: order.created_at ?? new Date(),
    completedAt: order.completedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listAdminOrders(opts: {
  search?: string;
  vendorUserId?: number;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}): Promise<{ rows: Order[]; count: number }> {
  const orderWhere: WhereOptions<any> = {};

  if (opts.status) {
    orderWhere['status'] = opts.status;
  }

  if (opts.from || opts.to) {
    const range: any = {};
    if (opts.from) range[Op.gte] = new Date(opts.from);
    if (opts.to) range[Op.lte] = new Date(opts.to);
    orderWhere['created_at'] = range;
  }

  if (opts.search) {
    orderWhere[Op.or as any] = [
      { code: { [Op.like]: `%${opts.search}%` } },
      where(col('user.email'), { [Op.like]: `%${opts.search}%` }),
      where(col('items.title_snapshot'), { [Op.like]: `%${opts.search}%` }),
    ];
  }

  // When filtering by vendor, we need a required join on order_items
  const itemsRequired = opts.vendorUserId !== undefined;
  const itemsWhere: WhereOptions<any> | undefined =
    opts.vendorUserId !== undefined ? { vendorUserId: opts.vendorUserId } : undefined;

  const { rows, count } = await Order.findAndCountAll({
    where: orderWhere,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'fullName'],
        required: true,
      },
      {
        model: OrderItem,
        as: 'items',
        required: itemsRequired,
        where: itemsWhere,
        include: [
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
      },
      {
        model: Payment,
        as: 'payments',
        attributes: ['id', 'status', 'amount', 'currency', 'referenceCode', 'expiresAt', 'paidAt', 'created_at', 'updated_at'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit: opts.limit,
    offset: (opts.page - 1) * opts.limit,
    distinct: true,
  });

  return { rows, count };
}

export async function findAdminOrderByCode(code: string): Promise<Order | null> {
  return Order.findOne({
    where: { code },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'fullName'],
        required: false,
      },
      {
        model: OrderItem,
        as: 'items',
        required: false,
        attributes: ['id', 'bookId', 'vendorUserId', 'titleSnapshot', 'unitPrice'],
      },
      {
        model: Payment,
        as: 'payments',
        // CRITICAL: explicitly exclude providerTxnId
        attributes: ['id', 'status', 'amount', 'currency', 'referenceCode', 'expiresAt', 'paidAt', 'created_at', 'updated_at'],
        required: false,
      },
    ],
  });
}

export { buildPaginationMeta };
