/**
 * Payments routes — POST /payments/:id/simulate
 */

import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { simulatePayment } from './payments.controller';

export const paymentsRouter = Router();

// Chỉ user đã đăng nhập với role 'user' mới được gọi simulate
paymentsRouter.post(
  '/:id/simulate',
  auth,
  requireRole('user'),
  asyncHandler(simulatePayment),
);
