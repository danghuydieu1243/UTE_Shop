import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import * as service from './vendor-books.service';
import {
  createBookSchema,
  updateBookSchema,
  patchStatusSchema,
  listVendorBooksQuerySchema,
  bookIdParamsSchema,
} from './vendor-books.schema';

// ── List ──────────────────────────────────────────────────────────────────────
export const listBooks = asyncHandler(async (req, res) => {
  const qResult = listVendorBooksQuerySchema.safeParse(req.query);
  if (!qResult.success) throw AppError.from('VALIDATION', 'Tham số truy vấn không hợp lệ', qResult.error.issues);

  const vendorUserId = req.user!.id;
  const { data, meta } = await service.listVendorBooks(vendorUserId, qResult.data);
  ok(res, data, meta);
});

// ── Get one ───────────────────────────────────────────────────────────────────
export const getBook = asyncHandler(async (req, res) => {
  const pResult = bookIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  ok(res, await service.getVendorBook(req.user!.id, pResult.data.id));
});

// ── Create ────────────────────────────────────────────────────────────────────
export const createBook = asyncHandler(async (req, res) => {
  const bodyResult = createBookSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  const files = (req.files as Record<string, Express.Multer.File[]>) ?? {};
  const result = await service.createBook(req.user!.id, bodyResult.data, files);
  created(res, result);
});

// ── Update ────────────────────────────────────────────────────────────────────
export const updateBook = asyncHandler(async (req, res) => {
  const pResult = bookIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  const bodyResult = updateBookSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  const files = (req.files as Record<string, Express.Multer.File[]>) ?? {};
  ok(res, await service.updateBook(req.user!.id, pResult.data.id, bodyResult.data, files));
});

// ── Patch status ──────────────────────────────────────────────────────────────
export const patchStatus = asyncHandler(async (req, res) => {
  const pResult = bookIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  const bodyResult = patchStatusSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  ok(res, await service.patchStatus(req.user!.id, pResult.data.id, bodyResult.data));
});

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteBook = asyncHandler(async (req, res) => {
  const pResult = bookIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  await service.deleteBook(req.user!.id, pResult.data.id);
  res.status(204).send();
});
