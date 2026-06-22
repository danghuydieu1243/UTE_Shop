import { sequelize } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './admin-vendors.repository';
import { ListVendorsQuery, PatchVendorStatusBody, AdminVendorDTO, PaginationMeta } from './admin.schema';

export async function listVendors(
  q: ListVendorsQuery,
): Promise<{ data: AdminVendorDTO[]; pagination: PaginationMeta }> {
  const { rows, count } = await repo.listVendors({
    search: q.search,
    status: q.status,
    from: q.from,
    to: q.to,
    page: q.page,
    limit: q.limit,
  });

  const data = await Promise.all(rows.map((v) => repo.mapAdminVendorDTO(v)));

  return {
    data,
    pagination: repo.buildPaginationMeta(q.page, q.limit, count),
  };
}

export async function updateVendorStatus(
  vendorUserId: number,
  body: PatchVendorStatusBody,
): Promise<AdminVendorDTO> {
  const vendor = await repo.findVendorById(vendorUserId);
  if (!vendor) {
    throw AppError.from('NOT_FOUND', 'Vendor không tồn tại');
  }

  // Transaction: set both vendors.status and users.status
  await sequelize.transaction(async () => {
    await repo.setVendorAndUserStatus(vendorUserId, body.status);
  });

  // Re-fetch updated vendor
  const updated = await repo.findVendorById(vendorUserId);
  return repo.mapAdminVendorDTO(updated!);
}
