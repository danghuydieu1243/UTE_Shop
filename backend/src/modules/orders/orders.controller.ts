import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { listOrdersQuerySchema, orderCodeParamSchema } from './orders.schema';
import * as ordersService from './orders.service';

// ── POST /orders — checkout ───────────────────────────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dto = await ordersService.createOrder(userId);
  created(res, dto);
});

// ── GET /orders — list ────────────────────────────────────────────────────────

export const listOrders = asyncHandler(async (req, res) => {
  const parsed = listOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { page, limit, status } = parsed.data;
  const userId = req.user!.id;

  const { data, pagination } = await ordersService.listOrders(userId, page, limit, status);
  ok(res, data, { pagination });
});

// ── GET /orders/:code — detail ────────────────────────────────────────────────

export const getOrder = asyncHandler(async (req, res) => {
  const parsed = orderCodeParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Mã đơn không hợp lệ', parsed.error.issues);
  }
  const userId = req.user!.id;
  const dto = await ordersService.getOrder(userId, parsed.data.code);
  ok(res, dto);
});

// ── POST /orders/:code/cancel ─────────────────────────────────────────────────

export const cancelOrder = asyncHandler(async (req, res) => {
  const parsed = orderCodeParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Mã đơn không hợp lệ', parsed.error.issues);
  }
  const userId = req.user!.id;
  const dto = await ordersService.cancelOrder(userId, parsed.data.code);
  ok(res, dto);
});

// ── POST /orders/:code/payment — tạo lại QR ──────────────────────────────────

export const recreatePayment = asyncHandler(async (req, res) => {
  const parsed = orderCodeParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Mã đơn không hợp lệ', parsed.error.issues);
  }
  const userId = req.user!.id;
  const dto = await ordersService.recreatePayment(userId, parsed.data.code);
  ok(res, dto);
});
