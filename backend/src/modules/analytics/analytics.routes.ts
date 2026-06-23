import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as vendor from './vendor-analytics.controller';

export const vendorAnalyticsRouter = Router();
vendorAnalyticsRouter.get('/dashboard', auth, requireRole('vendor'), vendor.getVendorDashboard);
