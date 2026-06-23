import { VendorBankAccount, Withdrawal } from '../../db/models';
import { CreateBankAccountInput, UpdateBankAccountInput } from './bank-accounts.schema';

export async function findAllByVendor(vendorUserId: number): Promise<VendorBankAccount[]> {
  return VendorBankAccount.findAll({
    where: { vendorUserId },
    order: [['created_at', 'DESC']],
  });
}

export async function create(vendorUserId: number, input: CreateBankAccountInput): Promise<VendorBankAccount> {
  return VendorBankAccount.create({
    vendorUserId,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountHolder: input.accountHolder,
    isDefault: input.isDefault ? 1 : 0,
  });
}

export async function findByIdForVendor(id: number, vendorUserId: number): Promise<VendorBankAccount | null> {
  return VendorBankAccount.findOne({ where: { id, vendorUserId } });
}

export async function update(
  account: VendorBankAccount,
  input: UpdateBankAccountInput,
): Promise<VendorBankAccount> {
  if (input.bankName !== undefined) account.bankName = input.bankName;
  if (input.accountNumber !== undefined) account.accountNumber = input.accountNumber;
  if (input.accountHolder !== undefined) account.accountHolder = input.accountHolder;
  return account.save();
}

export async function setDefault(
  accountId: number,
  vendorUserId: number,
): Promise<void> {
  const { sequelize } = await import('../../db/models');
  await sequelize.transaction(async (t) => {
    await VendorBankAccount.update(
      { isDefault: 0 },
      { where: { vendorUserId }, transaction: t },
    );
    await VendorBankAccount.update(
      { isDefault: 1 },
      { where: { id: accountId, vendorUserId }, transaction: t },
    );
  });
}

export async function hasProcessingWithdrawal(bankAccountId: number): Promise<boolean> {
  return (await Withdrawal.count({ where: { bankAccountId, status: 'processing' } })) > 0;
}

export async function deleteAccount(account: VendorBankAccount): Promise<void> {
  await account.destroy();
}
