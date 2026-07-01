import { Op, where, fn, col, literal } from 'sequelize';
import { Order, OrderItem } from '../../db/models';
import { sequelize } from '../../shared/db/sequelize';
import {
  ListVendorOrdersQuery,
  VendorOrderDTO,
  VendorOrderItemDTO,
  PaginationMeta,
} from './vendor-orders.schema';

function orderLocalDateExpr() {
  return sequelize.getDialect() === 'sqlite'
    ? fn('date', fn('datetime', col('Order.created_at'), '+7 hours'))
    : fn('date', literal('date_add(`Order`.`created_at`, interval 7 hour)'));
}

export function mapVendorOrderDTO(order: Order, vendorUserId: number): VendorOrderDTO {
  const allItems = ((order as any).items as OrderItem[]) ?? [];
  const vendorItems: VendorOrderItemDTO[] = allItems
    .filter((item) => Number(item.vendorUserId) === vendorUserId)
    .map((item) => ({
      bookId: Number(item.bookId),
      titleSnapshot: item.titleSnapshot,
      unitPrice: Number(item.unitPrice),
    }));

  return {
    code: order.code,
    status: order.status,
    total: Number(order.total),
    createdAt: order.created_at,
    items: vendorItems,
  };
}

export async function listVendorOrders(
  vendorUserId: number,
  query: ListVendorOrdersQuery,
): Promise<{ rows: Order[]; count: number }> {
  const { page, limit, status, q, fromDate, toDate } = query;

  // Find distinct order IDs that contain items belonging to this vendor
  const itemWhere: any = { vendorUserId };
  if (q) {
    itemWhere.titleSnapshot = where(fn('lower', col('title_snapshot')), {
      [Op.like]: `%${q.toLowerCase()}%`,
    });
  }

  const vendorItemOrderIds = await OrderItem.findAll({
    attributes: ['orderId'],
    where: itemWhere,
    group: ['order_id'],
    raw: true,
  });
  const matchingTitleOrderIds = vendorItemOrderIds.map((item: any) => Number(item.orderId));

  const vendorScopedOrderIds = await OrderItem.findAll({
    attributes: ['orderId'],
    where: { vendorUserId },
    group: ['order_id'],
    raw: true,
  });
  const orderIds = vendorScopedOrderIds.map((item: any) => Number(item.orderId));

  if (orderIds.length === 0) {
    return { rows: [], count: 0 };
  }

  const orderWhere: any = { id: { [Op.in]: orderIds } };
  if (status) orderWhere.status = status;
  if (q) {
    orderWhere[Op.or] = [
      where(fn('lower', col('Order.code')), { [Op.like]: `%${q.toLowerCase()}%` }),
      { id: { [Op.in]: matchingTitleOrderIds.length > 0 ? matchingTitleOrderIds : [-1] } },
    ];
  }
  if (fromDate || toDate) {
    const dateFilters = [];
    if (fromDate) {
      dateFilters.push(where(orderLocalDateExpr(), { [Op.gte]: fromDate }));
    }
    if (toDate) {
      dateFilters.push(where(orderLocalDateExpr(), { [Op.lte]: toDate }));
    }
    orderWhere[Op.and] = [...(orderWhere[Op.and] ?? []), ...dateFilters];
  }

  const { rows, count } = await Order.findAndCountAll({
    where: orderWhere,
    include: [
      {
        model: OrderItem,
        as: 'items',
        where: { vendorUserId },
        attributes: ['bookId', 'vendorUserId', 'titleSnapshot', 'unitPrice'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return { rows, count };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
