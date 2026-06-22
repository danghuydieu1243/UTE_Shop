import request from 'supertest';
import { createApp } from '../../../app';
import { User, LoyaltyAccount, LoyaltyTransaction, Order } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test-loyalty.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role}`,
    status: 'active',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

describe('GET /api/v1/me/loyalty', () => {
  it('L1. novo usuário → balance 0, transactions vazio', async () => {
    const user = await seedUser('user', `l1-${Date.now()}`);
    const token = makeToken(user.id);

    const res = await request(app)
      .get('/api/v1/me/loyalty')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.balance).toBe(0);
    expect(Array.isArray(d.transactions)).toBe(true);
    expect(d.transactions).toHaveLength(0);
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.total).toBe(0);
  });

  it('L2. sau khi có LoyaltyTransaction → balance và history đúng', async () => {
    const user = await seedUser('user', `l2-${Date.now()}`);
    const token = makeToken(user.id);

    // Seed account với 150 points
    await LoyaltyAccount.create({ userId: user.id, balancePoints: 150 });
    await LoyaltyTransaction.create({
      userId: user.id,
      type: 'earn',
      points: 150,
      note: 'Test earn',
    });

    const res = await request(app)
      .get('/api/v1/me/loyalty')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.balance).toBe(150);
    expect(d.transactions).toHaveLength(1);
    const txn = d.transactions[0];
    expect(txn.type).toBe('earn');
    expect(txn.points).toBe(150);
    expect(txn.note).toBe('Test earn');
    expect(txn.orderId).toBeNull();
    expect(txn.createdAt).toBeDefined();
  });

  it('L3. vendor gọi GET /me/loyalty → 403 FORBIDDEN', async () => {
    const vendor = await seedUser('vendor', `l3v-${Date.now()}`);
    const token = makeToken(vendor.id, 'vendor');

    const res = await request(app)
      .get('/api/v1/me/loyalty')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('L4. pagination → trả đúng page/limit', async () => {
    const user = await seedUser('user', `l4-${Date.now()}`);
    const token = makeToken(user.id);

    await LoyaltyAccount.create({ userId: user.id, balancePoints: 300 });
    for (let i = 0; i < 3; i++) {
      await LoyaltyTransaction.create({
        userId: user.id,
        type: 'earn',
        points: 100,
      });
    }

    const res = await request(app)
      .get('/api/v1/me/loyalty?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transactions).toHaveLength(2);
    expect(res.body.meta.pagination.total).toBe(3);
    expect(res.body.meta.pagination.totalPages).toBe(2);
  });
});
