import { AppError } from '../../shared/errors/AppError';
import * as repo from './admin-products.repository';
import {
  ListAdminProductsQuery,
  PatchProductStatusBody,
  AdminProductDTO,
  PaginationMeta,
} from './admin.schema';

export async function listAdminProducts(
  q: ListAdminProductsQuery,
): Promise<{ data: AdminProductDTO[]; pagination: PaginationMeta }> {
  const { rows, count } = await repo.listAdminProducts({
    search: q.search,
    vendorUserId: q.vendorUserId,
    status: q.status,
    page: q.page,
    limit: q.limit,
  });

  const data = await Promise.all(rows.map((b) => repo.mapAdminProductDTO(b)));

  return {
    data,
    pagination: repo.buildPaginationMeta(q.page, q.limit, count),
  };
}

export async function updateProductStatus(
  id: number,
  body: PatchProductStatusBody,
): Promise<AdminProductDTO> {
  const book = await repo.findAdminProductById(id);
  if (!book) {
    throw AppError.from('NOT_FOUND', `Sản phẩm ID=${id} không tồn tại`);
  }

  await repo.setProductStatus(id, body.status);

  const updated = await repo.findAdminProductById(id);
  return repo.mapAdminProductDTO(updated!);
}
