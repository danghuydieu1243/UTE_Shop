import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as usersCtrl from './admin-users.controller';
import * as vendorsCtrl from './admin-vendors.controller';

export const adminRouter = Router();

// Users — admin only
adminRouter.get('/users', auth, requireRole('admin'), usersCtrl.listUsers);
adminRouter.patch('/users/:id/status', auth, requireRole('admin'), usersCtrl.updateUserStatus);

// Vendors — admin or manager
adminRouter.get('/vendors', auth, requireRole('admin', 'manager'), vendorsCtrl.listVendors);
adminRouter.patch('/vendors/:id/status', auth, requireRole('admin', 'manager'), vendorsCtrl.updateVendorStatus);
