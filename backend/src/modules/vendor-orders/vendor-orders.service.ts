import * as repo from './vendor-orders.repository';
import { ListVendorOrdersQuery, VendorOrderDTO, PaginationMeta } from './vendor-orders.schema';

export async function listVendorOrders(
  vendorUserId: number,
  q: ListVendorOrdersQuery,
): Promise<{ data: VendorOrderDTO[]; pagination: PaginationMeta }> {
  const { rows, count } = await repo.listVendorOrders(vendorUserId, q.page, q.limit, q.status);
  return {
    data: rows.map((order) => repo.mapVendorOrderDTO(order, vendorUserId)),
    pagination: repo.buildPaginationMeta(q.page, q.limit, count),
  };
}
