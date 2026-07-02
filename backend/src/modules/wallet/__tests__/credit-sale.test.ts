import { VendorWallet, WalletTransaction, User } from '../../../db/models';
import { sequelize } from '../../../db/models';
import * as walletService from '../wallet.service';

afterEach(async () => {
  await WalletTransaction.destroy({ where: {} });
  await VendorWallet.destroy({ where: {} });
  await User.destroy({ where: {} });
});

it('creditSale cộng net và ghi breakdown', async () => {
  const vendor = await User.create({
    email: `vendor-credit-sale-${Date.now()}@test-wallet.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Vendor Test',
    status: 'active',
  });

  await sequelize.transaction(async (t) => {
    await walletService.creditSale(vendor.id, 100000, 1, t, 1000); // 10%
  });

  const wallet = await VendorWallet.findOne({ where: { vendorUserId: vendor.id } });
  expect(Number(wallet!.availableBalance)).toBe(90000); // net

  const tx = await WalletTransaction.findOne({ where: { vendorUserId: vendor.id } });
  expect(Number(tx!.amount)).toBe(90000); // net
  expect(Number(tx!.grossAmount)).toBe(100000);
  expect(Number(tx!.feeAmount)).toBe(10000);
  expect(tx!.commissionRateBps).toBe(1000);
});
