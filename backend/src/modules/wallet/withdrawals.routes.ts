import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './withdrawals.controller';

export const withdrawalsRouter = Router();

withdrawalsRouter.post('/', auth, requireRole('vendor'), c.createWithdrawal);
