/**
 * Withdrawals test suite — WD1–WD5
 * Tests cho POST /api/v1/vendor/withdrawals
 */

import request from 'supertest';
import { createApp } from '../../../app';
import {
  User, VendorWallet, VendorBankAccount, Withdrawal, WalletTransaction,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedVendor(suffix = '') {
  return User.create({
    email: `vendor${suffix}${Date.now()}@test-wd.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Test Vendor WD',
    status: 'active',
  });
}

async function seedUser(suffix = '') {
  return User.create({
    email: `user${suffix}${Date.now()}@test-wd.com`,
    passwordHash: 'hash',
    role: 'user',
    fullName: 'Test User WD',
    status: 'active',
  });
}

async function seedWallet(vendorUserId: number, availableBalance: number) {
  const [w] = await VendorWallet.findOrCreate({
    where: { vendorUserId },
    defaults: { vendorUserId, availableBalance },
  });
  // Update to the given balance in case it already existed
  await w.update({ availableBalance });
  return w;
}

async function seedBankAccount(vendorUserId: number) {
  return VendorBankAccount.create({
    vendorUserId,
    bankName: 'Vietcombank',
    accountNumber: `10${Date.now()}`,
    accountHolder: 'NGUYEN VAN A',
  });
}

function makeToken(userId: number, role = 'vendor') {
  return signAccessToken({ id: userId, role });
}

// ── WD1: amount < 100k → 422, wallet unchanged ────────────────────────────────

describe('WD1: amount < 100k → 422 WITHDRAWAL_MIN, ví không đổi', () => {
  it('WD1. amount=50000 → 422, available vẫn là 500000', async () => {
    const vendor = await seedVendor('wd1');
    const wallet = await seedWallet(vendor.id, 500000);
    const bank = await seedBankAccount(vendor.id);
    const token = makeToken(vendor.id, 'vendor');

    const res = await request(app)
      .post('/api/v1/vendor/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50000, bankAccountId: Number(bank.id) });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('WITHDRAWAL_MIN');

    // Wallet balance unchanged
    await wallet.reload();
    expect(Number(wallet.availableBalance)).toBe(500000);
  });
});

// ── WD2: amount > available → 422, wallet unchanged ───────────────────────────

describe('WD2: amount > available → 422 WITHDRAWAL_EXCEEDS_BALANCE, ví không đổi', () => {
  it('WD2. amount=300000 > available=200000 → 422', async () => {
    const vendor = await seedVendor('wd2');
    const wallet = await seedWallet(vendor.id, 200000);
    const bank = await seedBankAccount(vendor.id);
    const token = makeToken(vendor.id, 'vendor');

    const res = await request(app)
      .post('/api/v1/vendor/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 300000, bankAccountId: Number(bank.id) });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('WITHDRAWAL_EXCEEDS_BALANCE');

    // Wallet balance unchanged
    await wallet.reload();
    expect(Number(wallet.availableBalance)).toBe(200000);
  });
});

// ── WD3: bankAccountId not owned → 404 ───────────────────────────────────────

describe('WD3: bankAccountId không thuộc vendor → 404', () => {
  it('WD3. bank của vendor khác → 404 NOT_FOUND', async () => {
    const vendor1 = await seedVendor('wd3v1');
    const vendor2 = await seedVendor('wd3v2');
    await seedWallet(vendor1.id, 500000);
    const otherBank = await seedBankAccount(vendor2.id);
    const token = makeToken(vendor1.id, 'vendor');

    const res = await request(app)
      .post('/api/v1/vendor/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, bankAccountId: Number(otherBank.id) });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});

// ── WD4: valid request → 201, balance decreased, withdrawal + tx created ──────

describe('WD4: hợp lệ → 201, available giảm, withdrawal processing, withdrawal_debit âm', () => {
  it('WD4. amount=150000, available=500000 → available=350000, withdrawal status=processing, tx.amount=-150000', async () => {
    const vendor = await seedVendor('wd4');
    const wallet = await seedWallet(vendor.id, 500000);
    const bank = await seedBankAccount(vendor.id);
    const token = makeToken(vendor.id, 'vendor');

    const res = await request(app)
      .post('/api/v1/vendor/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 150000, bankAccountId: Number(bank.id) });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const d = res.body.data;
    expect(d.amount).toBe(150000);
    expect(d.status).toBe('processing');
    expect(d.bankAccountId).toBe(Number(bank.id));
    expect(d.id).toBeGreaterThan(0);

    // Wallet available decreased
    await wallet.reload();
    expect(Number(wallet.availableBalance)).toBe(350000);

    // Withdrawal record
    const wd = await Withdrawal.findByPk(d.id);
    expect(wd).not.toBeNull();
    expect(wd!.status).toBe('processing');
    expect(Number(wd!.amount)).toBe(150000);

    // WalletTransaction: type=withdrawal_debit, amount negative, balanceAfter=350000
    const txns = await WalletTransaction.findAll({
      where: { vendorUserId: vendor.id, type: 'withdrawal_debit' },
    });
    expect(txns).toHaveLength(1);
    expect(Number(txns[0].amount)).toBe(-150000);
    expect(Number(txns[0].balanceAfter)).toBe(350000);
    expect(Number(txns[0].withdrawalId)).toBe(d.id);
  });
});

// ── WD5: RBAC user → 403 ──────────────────────────────────────────────────────

describe('WD5: role user → 403', () => {
  it('WD5. user role gọi POST /vendor/withdrawals → 403 FORBIDDEN', async () => {
    const user = await seedUser('wd5');
    const token = makeToken(user.id, 'user');

    const res = await request(app)
      .post('/api/v1/vendor/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, bankAccountId: 1 });

    expect(res.status).toBe(403);
  });
});
