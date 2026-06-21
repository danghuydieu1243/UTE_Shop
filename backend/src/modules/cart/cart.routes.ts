import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './cart.controller';

export const cartRouter = Router();

// Tất cả endpoint chỉ cho role=user
cartRouter.get('/', auth, requireRole('user'), c.getCart);
cartRouter.post('/items', auth, requireRole('user'), c.addItem);
cartRouter.delete('/items/:bookId', auth, requireRole('user'), c.removeItem);
cartRouter.delete('/', auth, requireRole('user'), c.clearCart);
