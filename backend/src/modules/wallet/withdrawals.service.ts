import { sequelize, VendorWallet, VendorBankAccount, Withdrawal, WalletTransaction } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import { WithdrawalDTO } from './withdrawals.schema';

const MIN = 100_000;

export async function createWithdrawal(
  vendorUserId: number,
  input: { amount: number; bankAccountId: number },
): Promise<WithdrawalDTO> {
  return sequelize.transaction(async (t) => {
    if (input.amount < MIN) {
      throw AppError.from('WITHDRAWAL_MIN', `Số tiền rút tối thiểu ${MIN.toLocaleString('vi-VN')}đ`);
    }

    const bank = await VendorBankAccount.findOne({
      where: { id: input.bankAccountId, vendorUserId },
      transaction: t,
    });
    if (!bank) {
      throw AppError.from('NOT_FOUND', 'Không tìm thấy tài khoản ngân hàng');
    }

    const wallet = await VendorWallet.findOne({
      where: { vendorUserId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const available = wallet ? Number(wallet.availableBalance) : 0;

    if (input.amount > available) {
      throw AppError.from('WITHDRAWAL_EXCEEDS_BALANCE', 'Số tiền vượt quá số dư khả dụng');
    }

    const newBalance = available - input.amount;
    await wallet!.update({ availableBalance: newBalance }, { transaction: t });

    const wd = await Withdrawal.create(
      {
        vendorUserId,
        bankAccountId: input.bankAccountId,
        amount: input.amount,
        status: 'processing',
        requestedAt: new Date().toISOString().slice(0, 10),
      },
      { transaction: t },
    );

    await WalletTransaction.create(
      {
        vendorUserId,
        type: 'withdrawal_debit',
        amount: -input.amount,
        withdrawalId: Number(wd.id),
        balanceAfter: newBalance,
      },
      { transaction: t },
    );

    return {
      id: Number(wd.id),
      amount: Number(wd.amount),
      status: wd.status,
      bankAccountId: input.bankAccountId,
      requestedAt: wd.requestedAt,
    };
  });
}
