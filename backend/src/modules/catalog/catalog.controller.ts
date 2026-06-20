import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import * as catalogService from './catalog.service';
import { listBooksQuerySchema, detailParamsSchema } from './catalog.schema';
import { AppError } from '../../shared/errors/AppError';

export const home = asyncHandler(async (_req, res) => {
  ok(res, await catalogService.getHome());
});

export const listBooks = asyncHandler(async (req, res) => {
  const result = listBooksQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Tham số truy vấn không hợp lệ', result.error.issues);
  }
  const { data, meta } = await catalogService.listBooks(result.data);
  ok(res, data, meta);
});

export const bookDetail = asyncHandler(async (req, res) => {
  const result = detailParamsSchema.safeParse(req.params);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', result.error.issues);
  }
  ok(res, await catalogService.getBookDetail(result.data.idOrSlug));
});

export const categories = asyncHandler(async (_req, res) => {
  ok(res, { categories: await catalogService.getCategories() });
});

export const filters = asyncHandler(async (_req, res) => {
  ok(res, await catalogService.getFilters());
});
