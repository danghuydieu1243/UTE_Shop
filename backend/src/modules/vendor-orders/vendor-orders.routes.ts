import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './vendor-orders.controller';

export const vendorOrdersRouter = Router();
vendorOrdersRouter.get('/', auth, requireRole('vendor'), c.listOrders);
