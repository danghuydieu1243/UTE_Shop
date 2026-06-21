import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './orders.controller';

export const ordersRouter = Router();

// Tất cả endpoint chỉ cho role=user
ordersRouter.post('/', auth, requireRole('user'), c.createOrder);
ordersRouter.get('/', auth, requireRole('user'), c.listOrders);
ordersRouter.get('/:code', auth, requireRole('user'), c.getOrder);
ordersRouter.post('/:code/cancel', auth, requireRole('user'), c.cancelOrder);
ordersRouter.post('/:code/payment', auth, requireRole('user'), c.recreatePayment);
