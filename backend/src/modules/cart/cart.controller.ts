import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import { addItemBodySchema, removeItemParamsSchema } from './cart.schema';
import * as cartService from './cart.service';

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  ok(res, await cartService.getCart(userId));
});

export const addItem = asyncHandler(async (req, res) => {
  const result = addItemBodySchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues);
  }
  const userId = req.user!.id;
  created(res, await cartService.addItem(userId, result.data.bookId));
});

export const removeItem = asyncHandler(async (req, res) => {
  const result = removeItemParamsSchema.safeParse(req.params);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'bookId không hợp lệ', result.error.issues);
  }
  const userId = req.user!.id;
  ok(res, await cartService.removeItem(userId, result.data.bookId));
});

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  ok(res, await cartService.clearCart(userId));
});
