import { User, WalletTransaction } from '../index';

it('lưu được breakdown gross/fee/bps', async () => {
  const vendor = await User.create({
    email: `vendor-breakdown-${Date.now()}@test-wallet.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Vendor Breakdown',
    status: 'active',
  });
  const tx = await WalletTransaction.create({
    vendorUserId: vendor.id, type: 'sale_credit', amount: 90,
    orderId: 1, balanceAfter: 90,
    grossAmount: 100, feeAmount: 10, commissionRateBps: 1000,
  });
  const row = await WalletTransaction.findByPk(tx.id);
  expect(Number(row!.grossAmount)).toBe(100);
  expect(Number(row!.feeAmount)).toBe(10);
  expect(row!.commissionRateBps).toBe(1000);
});
