import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { dashboardQuerySchema } from './analytics.schema';
import * as service from './vendor-analytics.service';

export const getVendorDashboard = asyncHandler(async (req, res) => {
  const { period } = dashboardQuerySchema.parse(req.query);
  const dto = await service.getVendorDashboard(req.user!.id, period);
  ok(res, dto);
});
