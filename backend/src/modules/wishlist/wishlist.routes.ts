import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './wishlist.controller';

export const wishlistRouter = Router();

// Tất cả endpoint chỉ cho role=user
wishlistRouter.get('/', auth, requireRole('user'), c.listWishlist);
wishlistRouter.post('/', auth, requireRole('user'), c.addItem);
// DELETE / phải đứng trước DELETE /:bookId để tránh "clear-all" bị khớp /:bookId
wishlistRouter.delete('/', auth, requireRole('user'), c.clearAll);
wishlistRouter.delete('/:bookId', auth, requireRole('user'), c.removeItem);
