import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './coupons.controller';

// ── Vendor routes ─────────────────────────────────────────────────────────────
export const vendorCouponsRouter = Router();

vendorCouponsRouter.get('/', auth, requireRole('vendor'), c.listCoupons);
vendorCouponsRouter.post('/', auth, requireRole('vendor'), c.createCoupon);
vendorCouponsRouter.patch('/:id', auth, requireRole('vendor'), c.updateCoupon);
vendorCouponsRouter.delete('/:id', auth, requireRole('vendor'), c.deleteCoupon);

// ── Me routes ─────────────────────────────────────────────────────────────────
export const meCouponsRouter = Router();

meCouponsRouter.post('/validate', auth, requireRole('user'), c.validateCoupon);
