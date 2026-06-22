import { AppError } from '../../shared/errors/AppError';
import * as repo from './admin-orders.repository';
import {
  ListAdminOrdersQuery,
  AdminOrderSummaryDTO,
  AdminOrderDetailDTO,
  PaginationMeta,
} from './admin.schema';

export async function listAdminOrders(
  q: ListAdminOrdersQuery,
): Promise<{ data: AdminOrderSummaryDTO[]; pagination: PaginationMeta }> {
  const { rows, count } = await repo.listAdminOrders({
    search: q.search,
    vendorUserId: q.vendorUserId,
    status: q.status,
    from: q.from,
    to: q.to,
    page: q.page,
    limit: q.limit,
  });

  const data = rows.map(repo.mapAdminOrderSummaryDTO);

  return {
    data,
    pagination: repo.buildPaginationMeta(q.page, q.limit, count),
  };
}

export async function getAdminOrderDetail(code: string): Promise<AdminOrderDetailDTO> {
  const order = await repo.findAdminOrderByCode(code);
  if (!order) {
    throw AppError.from('NOT_FOUND', `Đơn hàng "${code}" không tồn tại`);
  }
  return repo.mapAdminOrderDetailDTO(order);
}
