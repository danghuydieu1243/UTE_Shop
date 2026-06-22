import request from 'supertest';
import { createApp } from '../../../app';
import { User } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function seedUser(
  role: 'user' | 'vendor' | 'admin' | 'manager',
  suffix = '',
  status: 'active' | 'pending' | 'locked' = 'active',
) {
  return User.create({
    email: `${role}${suffix}${Date.now()}-${Math.random().toString(36).slice(2)}@test-admin.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role} ${suffix}`,
    status,
  });
}

function makeToken(userId: number, role: string) {
  return signAccessToken({ id: userId, role });
}

describe('Admin Users API', () => {
  let admin: User;
  let admin2: User;
  let manager: User;
  let vendor: User;
  let normalUser: User;
  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    admin = await seedUser('admin', 'a1');
    admin2 = await seedUser('admin', 'a2');
    manager = await seedUser('manager', 'm1');
    vendor = await seedUser('vendor', 'v1');
    normalUser = await seedUser('user', 'u1');

    adminToken = makeToken(admin.id, 'admin');
    managerToken = makeToken(manager.id, 'manager');
    userToken = makeToken(normalUser.id, 'user');
  });

  // ── AU1: admin list users ─────────────────────────────────────────────
  it('AU1. admin lists users — returns paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta?.pagination).toBeDefined();
    expect(res.body.meta.pagination).toHaveProperty('page');
    expect(res.body.meta.pagination).toHaveProperty('total');
    // NEVER expose passwordHash
    res.body.data.forEach((u: any) => {
      expect(u.passwordHash).toBeUndefined();
      expect(u.password_hash).toBeUndefined();
    });
  });

  // ── AU2: filter by role ───────────────────────────────────────────────
  it('AU2. admin filters users by role=vendor — only vendor users returned', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?role=vendor')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach((u: any) => {
      expect(u.role).toBe('vendor');
    });
  });

  // ── AU3: filter by status ─────────────────────────────────────────────
  it('AU3. admin filters users by status=active — only active users returned', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((u: any) => {
      expect(u.status).toBe('active');
    });
  });

  // ── AU4: pagination ───────────────────────────────────────────────────
  it('AU4. pagination — page=1&limit=2 returns at most 2 users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.pagination.limit).toBe(2);
    expect(res.body.meta.pagination.page).toBe(1);
  });

  // ── AU5: manager → 403 on /admin/users ───────────────────────────────
  it('AU5. manager calling GET /admin/users → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
  });

  // ── AU6: plain user → 403 ────────────────────────────────────────────
  it('AU6. plain user calling GET /admin/users → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  // ── AU7: lock a user — assert DB state ───────────────────────────────
  it('AU7. admin locks a user — DB status becomes locked', async () => {
    const target = await seedUser('user', 'lock-target');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('locked');

    // Assert DB
    const dbUser = await User.findByPk(target.id);
    expect(dbUser!.status).toBe('locked');
  });

  // ── AU8: unlock a user ────────────────────────────────────────────────
  it('AU8. admin unlocks a locked user — DB status becomes active', async () => {
    const target = await seedUser('user', 'unlock-target', 'locked');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');

    const dbUser = await User.findByPk(target.id);
    expect(dbUser!.status).toBe('active');
  });

  // ── AU9: self-lock → 409 ADMIN_CANNOT_LOCK_SELF ───────────────────────
  it('AU9. self-lock attempt → 409 ADMIN_CANNOT_LOCK_SELF', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADMIN_CANNOT_LOCK_SELF');
  });

  // ── AU10: locking another admin → 403 ────────────────────────────────
  it('AU10. locking another admin → 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin2.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(403);
  });
});
