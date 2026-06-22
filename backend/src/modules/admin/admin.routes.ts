import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as usersCtrl from './admin-users.controller';
import * as vendorsCtrl from './admin-vendors.controller';
import * as ordersCtrl from './admin-orders.controller';
import * as productsCtrl from './admin-products.controller';

export const adminRouter = Router();

// Users — admin only
adminRouter.get('/users', auth, requireRole('admin'), usersCtrl.listUsers);
adminRouter.patch('/users/:id/status', auth, requireRole('admin'), usersCtrl.updateUserStatus);

// Vendors — admin or manager
adminRouter.get('/vendors', auth, requireRole('admin', 'manager'), vendorsCtrl.listVendors);
adminRouter.patch('/vendors/:id/status', auth, requireRole('admin', 'manager'), vendorsCtrl.updateVendorStatus);

// Orders — admin or manager (read-only)
adminRouter.get('/orders', auth, requireRole('admin', 'manager'), ordersCtrl.listAdminOrders);
adminRouter.get('/orders/:code', auth, requireRole('admin', 'manager'), ordersCtrl.getAdminOrderDetail);

// Products — admin or manager
adminRouter.get('/products', auth, requireRole('admin', 'manager'), productsCtrl.listAdminProducts);
adminRouter.patch('/products/:id/status', auth, requireRole('admin', 'manager'), productsCtrl.updateProductStatus);
