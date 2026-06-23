import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as vendor from './vendor-analytics.controller';
import * as admin from './admin-analytics.controller';

export const vendorAnalyticsRouter = Router();
vendorAnalyticsRouter.get('/dashboard', auth, requireRole('vendor'), vendor.getVendorDashboard);

export const adminAnalyticsRouter = Router();
adminAnalyticsRouter.get('/dashboard', auth, requireRole('admin', 'manager'), admin.getAdminDashboard);
