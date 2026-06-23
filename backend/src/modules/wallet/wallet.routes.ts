import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './wallet.controller';

export const walletRouter = Router();

walletRouter.get('/', auth, requireRole('vendor'), c.getWallet);
