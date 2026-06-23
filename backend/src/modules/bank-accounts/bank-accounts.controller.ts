import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import { createBankAccountSchema, updateBankAccountSchema } from './bank-accounts.schema';
import * as service from './bank-accounts.service';

export const listAccounts = asyncHandler(async (req, res) => {
  const vendorUserId = req.user!.id;
  const accounts = await service.listAccounts(vendorUserId);
  ok(res, accounts);
});

export const createAccount = asyncHandler(async (req, res) => {
  const vendorUserId = req.user!.id;
  const result = createBankAccountSchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues);
  }
  const account = await service.createAccount(vendorUserId, result.data);
  created(res, account);
});

export const updateAccount = asyncHandler(async (req, res) => {
  const vendorUserId = req.user!.id;
  const accountId = Number(req.params.id);
  const result = updateBankAccountSchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues);
  }
  const account = await service.updateAccount(vendorUserId, accountId, result.data);
  ok(res, account);
});

export const setDefault = asyncHandler(async (req, res) => {
  const vendorUserId = req.user!.id;
  const accountId = Number(req.params.id);
  const account = await service.setDefaultAccount(vendorUserId, accountId);
  ok(res, account);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const vendorUserId = req.user!.id;
  const accountId = Number(req.params.id);
  await service.deleteAccount(vendorUserId, accountId);
  ok(res, null);
});
