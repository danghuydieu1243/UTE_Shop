import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { dashboardQuerySchema } from './analytics.schema';
import * as service from './admin-analytics.service';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const { period } = dashboardQuerySchema.parse(req.query);
  const dto = await service.getAdminDashboard(period, req.user!.role);
  ok(res, dto);
});
