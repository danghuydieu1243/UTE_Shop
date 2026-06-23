import * as repo from './bank-accounts.repository';
import { maskAccount, BankAccountDTO, CreateBankAccountInput, UpdateBankAccountInput } from './bank-accounts.schema';
import { AppError } from '../../shared/errors/AppError';
import { VendorBankAccount } from '../../db/models';

function toDTO(account: VendorBankAccount): BankAccountDTO {
  return {
    id: Number(account.id),
    bankName: account.bankName,
    accountNumberMasked: maskAccount(account.accountNumber),
    accountHolder: account.accountHolder,
    isDefault: account.isDefault === 1,
    createdAt: account.created_at ?? null,
  };
}

export async function listAccounts(vendorUserId: number): Promise<BankAccountDTO[]> {
  const accounts = await repo.findAllByVendor(vendorUserId);
  return accounts.map(toDTO);
}

export async function createAccount(
  vendorUserId: number,
  input: CreateBankAccountInput,
): Promise<BankAccountDTO> {
  const existing = await repo.findAllByVendor(vendorUserId);

  // First account auto-default
  const shouldBeDefault = existing.length === 0 ? true : (input.isDefault ?? false);

  if (shouldBeDefault && existing.length > 0) {
    // Clear other defaults first — handled after creation
  }

  const account = await repo.create(vendorUserId, {
    ...input,
    isDefault: shouldBeDefault,
  });

  if (shouldBeDefault) {
    await repo.setDefault(Number(account.id), vendorUserId);
    // Refresh after setDefault
    const refreshed = await repo.findByIdForVendor(Number(account.id), vendorUserId);
    return toDTO(refreshed!);
  }

  return toDTO(account);
}

export async function updateAccount(
  vendorUserId: number,
  accountId: number,
  input: UpdateBankAccountInput,
): Promise<BankAccountDTO> {
  const account = await repo.findByIdForVendor(accountId, vendorUserId);
  if (!account) throw AppError.from('NOT_FOUND', 'Tài khoản ngân hàng không tồn tại');
  const updated = await repo.update(account, input);
  return toDTO(updated);
}

export async function setDefaultAccount(
  vendorUserId: number,
  accountId: number,
): Promise<BankAccountDTO> {
  const account = await repo.findByIdForVendor(accountId, vendorUserId);
  if (!account) throw AppError.from('NOT_FOUND', 'Tài khoản ngân hàng không tồn tại');
  await repo.setDefault(accountId, vendorUserId);
  const refreshed = await repo.findByIdForVendor(accountId, vendorUserId);
  return toDTO(refreshed!);
}

export async function deleteAccount(
  vendorUserId: number,
  accountId: number,
): Promise<void> {
  const account = await repo.findByIdForVendor(accountId, vendorUserId);
  if (!account) throw AppError.from('NOT_FOUND', 'Tài khoản ngân hàng không tồn tại');

  const inUse = await repo.hasProcessingWithdrawal(accountId);
  if (inUse) throw AppError.from('BANK_ACCOUNT_IN_USE', 'Tài khoản đang có lệnh rút tiền đang xử lý');

  await repo.deleteAccount(account);
}
