import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import { addItemBodySchema, removeItemParamsSchema, listQuerySchema } from './wishlist.schema';
import * as wishlistService from './wishlist.service';

// ── GET /me/wishlist — list ───────────────────────────────────────────────────

export const listWishlist = asyncHandler(async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { page, limit } = parsed.data;
  const userId = req.user!.id;

  const { items, pagination } = await wishlistService.list(userId, page, limit);
  ok(res, items, { pagination });
});

// ── POST /me/wishlist — add ───────────────────────────────────────────────────

export const addItem = asyncHandler(async (req, res) => {
  const parsed = addItemBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', parsed.error.issues);
  }
  const userId = req.user!.id;
  const result = await wishlistService.addItem(userId, parsed.data.bookId);
  created(res, result);
});

// ── DELETE /me/wishlist — clear all (idempotent) ─────────────────────────────

export const clearAll = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  await wishlistService.clearAll(userId);
  ok(res, { cleared: true });
});

// ── DELETE /me/wishlist/:bookId — remove ──────────────────────────────────────

export const removeItem = asyncHandler(async (req, res) => {
  const parsed = removeItemParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'bookId không hợp lệ', parsed.error.issues);
  }
  const userId = req.user!.id;
  await wishlistService.removeItem(userId, parsed.data.bookId);
  ok(res, { removed: true });
});
