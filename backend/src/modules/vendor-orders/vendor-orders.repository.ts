import { Op } from 'sequelize';
import { Order, OrderItem } from '../../db/models';
import { VendorOrderDTO, VendorOrderItemDTO, PaginationMeta } from './vendor-orders.schema';

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
  page: number,
  limit: number,
  status?: string,
): Promise<{ rows: Order[]; count: number }> {
  // Find distinct order IDs that contain items belonging to this vendor
  const vendorItemOrderIds = await OrderItem.findAll({
    attributes: ['orderId'],
    where: { vendorUserId },
    group: ['order_id'],
    raw: true,
  });
  const orderIds = vendorItemOrderIds.map((item: any) => Number(item.orderId));

  if (orderIds.length === 0) {
    return { rows: [], count: 0 };
  }

  const where: any = { id: { [Op.in]: orderIds } };
  if (status) where.status = status;

  const { rows, count } = await Order.findAndCountAll({
    where,
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
