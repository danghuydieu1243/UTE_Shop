import { Op } from 'sequelize';
import { VendorWallet, WalletTransaction, OrderItem, Order, Withdrawal } from '../../db/models';

export async function findOrCreateWallet(vendorUserId: number, t?: import('sequelize').Transaction) {
  const [w] = await VendorWallet.findOrCreate({
    where: { vendorUserId },
    defaults: { vendorUserId },
    ...(t ? { transaction: t } : {}),
  });
  return w;
}

export async function pendingForVendor(vendorUserId: number): Promise<number> {
  const items = await OrderItem.findAll({
    where: { vendorUserId },
    include: [{ model: Order, as: 'order', required: true, where: { status: 'NEW' }, attributes: [] }],
    attributes: ['unitPrice'],
  });
  return items.reduce((s, it) => s + Number(it.unitPrice), 0);
}

export async function totalWithdrawn(vendorUserId: number): Promise<number> {
  const rows = await Withdrawal.findAll({
    where: { vendorUserId, status: { [Op.in]: ['processing', 'completed'] } },
    attributes: ['amount'],
  });
  return rows.reduce((s, r) => s + Number(r.amount), 0);
}

export async function listTxns(vendorUserId: number, page: number, limit: number) {
  return WalletTransaction.findAndCountAll({
    where: { vendorUserId },
    include: [{ model: Withdrawal, as: 'withdrawal', attributes: ['status'] }],
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function saleCreditsLast6Months(vendorUserId: number, from: Date) {
  return WalletTransaction.findAll({
    where: { vendorUserId, type: 'sale_credit', created_at: { [Op.gte]: from } },
    attributes: ['amount', 'created_at'],
  });
}
