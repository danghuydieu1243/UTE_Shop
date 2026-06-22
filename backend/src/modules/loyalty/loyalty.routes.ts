import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './loyalty.controller';

export const loyaltyRouter = Router();

loyaltyRouter.get('/', auth, requireRole('user'), c.getLoyalty);
