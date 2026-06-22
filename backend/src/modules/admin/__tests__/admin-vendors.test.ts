import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Book } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function seedUser(
  role: 'user' | 'vendor' | 'admin' | 'manager',
  suffix = '',
  status: 'active' | 'pending' | 'locked' = 'active',
) {
  return User.create({
    email: `${role}${suffix}${Date.now()}-${Math.random().toString(36).slice(2)}@test-adminv.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role} ${suffix}`,
    status,
  });
}

async function seedVendor(userId: number, suffix = '') {
  return Vendor.create({
    userId,
    shopName: `Shop ${suffix} ${Date.now()}`,
    shopSlug: `shop-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number, status = 'published') {
  return Book.create({
    vendorUserId,
    title: `Book ${Date.now()}`,
    slug: `book-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    price: 50000,
    fileFormat: 'PDF',
    status,
  });
}

function makeToken(userId: number, role: string) {
  return signAccessToken({ id: userId, role });
}

describe('Admin Vendors API', () => {
  let admin: User;
  let manager: User;
  let vendorUser: User;
  let normalUser: User;
  let vendorRecord: Vendor;
  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    admin = await seedUser('admin', 'av-a');
    manager = await seedUser('manager', 'av-m');
    vendorUser = await seedUser('vendor', 'av-v');
    normalUser = await seedUser('user', 'av-u');
    vendorRecord = await seedVendor(vendorUser.id, 'av');
    // Seed a published book for bookCount
    await seedBook(vendorUser.id, 'published');
    await seedBook(vendorUser.id, 'draft'); // should NOT count

    adminToken = makeToken(admin.id, 'admin');
    managerToken = makeToken(manager.id, 'manager');
    userToken = makeToken(normalUser.id, 'user');
  });

  // ── AV1: admin can list vendors ───────────────────────────────────────
  it('AV1. admin lists vendors — returns paginated list with DTO', async () => {
    const res = await request(app)
      .get('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta?.pagination).toBeDefined();

    const found = res.body.data.find((v: any) => v.userId === Number(vendorUser.id));
    expect(found).toBeDefined();
    expect(found).toHaveProperty('shopName');
    expect(found).toHaveProperty('ownerEmail');
    expect(found).toHaveProperty('bookCount');
    expect(found.bookCount).toBe(1); // only published counts
    // no password
    expect(found.passwordHash).toBeUndefined();
  });

  // ── AV2: manager can list vendors ────────────────────────────────────
  it('AV2. manager lists vendors — 200 OK', async () => {
    const res = await request(app)
      .get('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── AV3: plain user → 403 ────────────────────────────────────────────
  it('AV3. plain user calling GET /admin/vendors → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  // ── AV4: admin locks vendor → BOTH DB rows updated ───────────────────
  it('AV4. admin locks vendor — vendors.status AND users.status = locked', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/vendors/${vendorUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('locked');

    // Assert both DB rows
    const dbVendor = await Vendor.findOne({ where: { userId: vendorUser.id } });
    const dbUser = await User.findByPk(vendorUser.id);
    expect(dbVendor!.status).toBe('locked');
    expect(dbUser!.status).toBe('locked');
  });

  // ── AV5: admin unlocks vendor → BOTH DB rows updated ────────────────
  it('AV5. admin unlocks vendor — vendors.status AND users.status = active', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/vendors/${vendorUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');

    const dbVendor = await Vendor.findOne({ where: { userId: vendorUser.id } });
    const dbUser = await User.findByPk(vendorUser.id);
    expect(dbVendor!.status).toBe('active');
    expect(dbUser!.status).toBe('active');
  });

  // ── AV6: plain user → 403 on PATCH vendors ──────────────────────────
  it('AV6. plain user calling PATCH /admin/vendors/:id/status → 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/vendors/${vendorUser.id}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(403);
  });
});
