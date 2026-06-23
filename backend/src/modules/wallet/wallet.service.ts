import { Transaction } from 'sequelize';
import * as repo from './wallet.repository';
import { WalletDTO } from './wallet.schema';

export async function creditSale(
  vendorUserId: number,
  amount: number,
  orderId: number,
  t: Transaction,
): Promise<void> {
  const wallet = await repo.findOrCreateWallet(vendorUserId, t);
  const newBalance = Number(wallet.availableBalance) + amount;
  await wallet.update({ availableBalance: newBalance }, { transaction: t });
  const { WalletTransaction } = await import('../../db/models');
  await WalletTransaction.create(
    { vendorUserId, type: 'sale_credit', amount, orderId, balanceAfter: newBalance },
    { transaction: t },
  );
}

export async function getWallet(vendorUserId: number, page: number, limit: number): Promise<WalletDTO> {
  const wallet = await repo.findOrCreateWallet(vendorUserId);
  const [pending, withdrawn, txns] = await Promise.all([
    repo.pendingForVendor(vendorUserId),
    repo.totalWithdrawn(vendorUserId),
    repo.listTxns(vendorUserId, page, limit),
  ]);

  // Build monthly series for last 6 months (JS-side bucketing — dialect-safe)
  const from = new Date();
  from.setMonth(from.getMonth() - 5, 1);
  from.setHours(0, 0, 0, 0);

  const credits = await repo.saleCreditsLast6Months(vendorUserId, from);

  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const monthMap = new Map<string, number>();
  const cur = new Date(from);
  for (let i = 0; i < 6; i++) {
    monthMap.set(monthKey(cur), 0);
    cur.setMonth(cur.getMonth() + 1);
  }
  for (const c of credits) {
    const k = monthKey(new Date(c.created_at));
    if (monthMap.has(k)) {
      monthMap.set(k, (monthMap.get(k) ?? 0) + Number(c.amount));
    }
  }
  const monthlySeries = Array.from(monthMap.entries()).map(([month, value]) => ({ month, value }));

  return {
    availableBalance: Number(wallet.availableBalance),
    pendingBalance: pending,
    totalWithdrawn: withdrawn,
    monthlySeries,
    transactions: txns.rows.map((tx) => ({
      id: Number(tx.id),
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.type === 'sale_credit' ? 'Doanh thu đơn hàng' : 'Yêu cầu rút tiền',
      status:
        tx.type === 'sale_credit'
          ? 'credited'
          : ((tx as any).withdrawal?.status ?? 'processing'),
      createdAt: new Date(tx.created_at).toISOString(),
    })),
    pagination: {
      page,
      limit,
      total: txns.count,
      totalPages: Math.max(1, Math.ceil(txns.count / limit)),
    },
  };
}
