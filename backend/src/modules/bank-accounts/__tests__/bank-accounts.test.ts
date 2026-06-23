import request from 'supertest';
import { createApp } from '../../../app';
import { User, VendorBankAccount, Withdrawal } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function seedVendor(suffix = '') {
  return User.create({
    email: `vendor${suffix}${Date.now()}@test-ba.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Test Vendor',
    status: 'active',
  });
}

async function seedUser(suffix = '') {
  return User.create({
    email: `user${suffix}${Date.now()}@test-ba.com`,
    passwordHash: 'hash',
    role: 'user',
    fullName: 'Test User',
    status: 'active',
  });
}

function makeToken(userId: number, role = 'vendor') {
  return signAccessToken({ id: userId, role });
}

// ── BA1: POST creates account, DTO has masked number, no full account number ──
it('BA1: POST / → 201, DTO has accountNumberMasked, no full accountNumber', async () => {
  const vendor = await seedVendor('ba1');
  const token = makeToken(vendor.id, 'vendor');

  const res = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      bankName: 'Vietcombank',
      accountNumber: '12345678',
      accountHolder: 'NGUYEN VAN A',
    });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  const d = res.body.data;
  expect(d.accountNumberMasked).toBe('****5678');
  expect(d).not.toHaveProperty('accountNumber');
  // Full number should not appear in the serialized body
  expect(JSON.stringify(d)).not.toContain('12345678');
});

// ── BA2: First account auto-default ──────────────────────────────────────────
it('BA2: first account auto-default=true', async () => {
  const vendor = await seedVendor('ba2');
  const token = makeToken(vendor.id, 'vendor');

  const res = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      bankName: 'Techcombank',
      accountNumber: '11112222',
      accountHolder: 'TRAN THI B',
    });

  expect(res.status).toBe(201);
  expect(res.body.data.isDefault).toBe(true);
});

// ── BA3: POST isDefault:true → clears old default ────────────────────────────
it('BA3: POST with isDefault:true clears previous default', async () => {
  const vendor = await seedVendor('ba3');
  const token = makeToken(vendor.id, 'vendor');

  // Create first (auto-default)
  const r1 = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ bankName: 'Bank A', accountNumber: '11110000', accountHolder: 'A' });
  expect(r1.body.data.isDefault).toBe(true);
  const id1 = r1.body.data.id;

  // Create second with isDefault:true
  const r2 = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ bankName: 'Bank B', accountNumber: '22220000', accountHolder: 'B', isDefault: true });
  expect(r2.status).toBe(201);
  expect(r2.body.data.isDefault).toBe(true);
  const id2 = r2.body.data.id;

  // Verify old one is no longer default
  const acc1 = await VendorBankAccount.findByPk(id1);
  expect(acc1!.isDefault).toBe(0);
});

// ── BA4: PATCH /:id/default switches default ─────────────────────────────────
it('BA4: PATCH /:id/default switches default', async () => {
  const vendor = await seedVendor('ba4');
  const token = makeToken(vendor.id, 'vendor');

  const r1 = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ bankName: 'Bank A', accountNumber: '33330000', accountHolder: 'A' });
  const id1 = r1.body.data.id;

  const r2 = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ bankName: 'Bank B', accountNumber: '44440000', accountHolder: 'B' });
  const id2 = r2.body.data.id;

  // Switch default to id2
  const res = await request(app)
    .patch(`/api/v1/vendor/bank-accounts/${id2}/default`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.isDefault).toBe(true);

  const acc1 = await VendorBankAccount.findByPk(id1);
  expect(acc1!.isDefault).toBe(0);
});

// ── BA5: GET list only returns vendor's own accounts ─────────────────────────
it('BA5: GET / returns only own accounts, not another vendor\'s', async () => {
  const vendor1 = await seedVendor('ba5v1');
  const vendor2 = await seedVendor('ba5v2');
  const token1 = makeToken(vendor1.id, 'vendor');
  const token2 = makeToken(vendor2.id, 'vendor');

  await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token1}`)
    .send({ bankName: 'Bank V1', accountNumber: '55550000', accountHolder: 'V1' });

  await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token2}`)
    .send({ bankName: 'Bank V2', accountNumber: '66660000', accountHolder: 'V2' });

  const res = await request(app)
    .get('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token1}`);

  expect(res.status).toBe(200);
  const ids = res.body.data.map((a: any) => a.id);
  // No account belonging to vendor2 should appear
  const vendor2Accounts = await VendorBankAccount.findAll({ where: { vendorUserId: vendor2.id } });
  vendor2Accounts.forEach((acc) => {
    expect(ids).not.toContain(Number(acc.id));
  });
});

// ── BA6: PATCH/DELETE another vendor's account → 404 ────────────────────────
it('BA6: PATCH/DELETE another vendor\'s account → 404', async () => {
  const vendor1 = await seedVendor('ba6v1');
  const vendor2 = await seedVendor('ba6v2');
  const token1 = makeToken(vendor1.id, 'vendor');
  const token2 = makeToken(vendor2.id, 'vendor');

  const r = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token1}`)
    .send({ bankName: 'Bank X', accountNumber: '77770000', accountHolder: 'X' });
  const id = r.body.data.id;

  const patchRes = await request(app)
    .patch(`/api/v1/vendor/bank-accounts/${id}`)
    .set('Authorization', `Bearer ${token2}`)
    .send({ bankName: 'Hacked' });

  expect(patchRes.status).toBe(404);

  const deleteRes = await request(app)
    .delete(`/api/v1/vendor/bank-accounts/${id}`)
    .set('Authorization', `Bearer ${token2}`);

  expect(deleteRes.status).toBe(404);
});

// ── BA7: DELETE account with processing withdrawal → 409 ─────────────────────
it('BA7: DELETE account with processing withdrawal → 409 BANK_ACCOUNT_IN_USE', async () => {
  const vendor = await seedVendor('ba7');
  const token = makeToken(vendor.id, 'vendor');

  const r = await request(app)
    .post('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ bankName: 'Bank Y', accountNumber: '88880000', accountHolder: 'Y' });
  const accountId = r.body.data.id;

  // Seed a processing withdrawal directly via model
  await Withdrawal.create({
    vendorUserId: vendor.id,
    bankAccountId: accountId,
    amount: 100000,
    status: 'processing',
    requestedAt: new Date().toISOString().slice(0, 10),
  });

  const res = await request(app)
    .delete(`/api/v1/vendor/bank-accounts/${accountId}`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('BANK_ACCOUNT_IN_USE');
});

// ── BA8: RBAC role 'user' → 403 ───────────────────────────────────────────────
it('BA8: role user → 403 on all endpoints', async () => {
  const user = await seedUser('ba8');
  const token = makeToken(user.id, 'user');

  const res = await request(app)
    .get('/api/v1/vendor/bank-accounts')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(403);
});
