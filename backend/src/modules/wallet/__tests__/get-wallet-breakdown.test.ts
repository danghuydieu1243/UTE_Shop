import { VendorWallet, WalletTransaction, User } from '../../../db/models';
import { sequelize } from '../../../db/models';
import * as walletService from '../wallet.service';

afterEach(async () => {
  await WalletTransaction.destroy({ where: {} });
  await VendorWallet.destroy({ where: {} });
  await User.destroy({ where: {} });
});

it('getWallet trả breakdown cho sale_credit', async () => {
  const vendor = await User.create({
    email: `vendor-get-wallet-breakdown-${Date.now()}@test-wallet.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Vendor Test',
    status: 'active',
  });

  await sequelize.transaction((t) => walletService.creditSale(vendor.id, 100000, 1, t, 1000));

  const dto = await walletService.getWallet(vendor.id, 1, 10);
  const credit = dto.transactions.find((x) => x.type === 'sale_credit')!;
  expect(credit).toBeDefined();
  expect(credit.grossAmount).toBe(100000);
  expect(credit.feeAmount).toBe(10000);
  expect(credit.commissionRateBps).toBe(1000);
  expect(credit.amount).toBe(90000);
});
