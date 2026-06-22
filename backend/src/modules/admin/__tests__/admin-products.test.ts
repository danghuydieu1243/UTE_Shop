import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Book, Author } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

let uidCounter = 0;
function uid() {
  return `${Date.now()}-${++uidCounter}-${Math.random().toString(36).slice(2)}`;
}

async function seedUser(role: 'user' | 'vendor' | 'admin' | 'manager', suffix = '') {
  return User.create({
    email: `${role}${suffix}-${uid()}@test-adminproducts.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role} ${suffix}`,
    status: 'active',
  });
}

async function seedVendor(userId: number, shopName = 'TestShop') {
  return Vendor.create({
    userId,
    shopName: `${shopName}-${uid()}`,
    shopSlug: `shop-${uid()}`,
    status: 'active',
  });
}

async function seedAuthor(name = 'Author') {
  return Author.create({
    name: `${name}-${uid()}`,
    slug: `author-${uid()}`,
  });
}

async function seedBook(
  vendorUserId: number,
  status: 'draft' | 'published' | 'hidden' = 'published',
  authorId?: number,
) {
  return Book.create({
    vendorUserId,
    title: `Book-${uid()}`,
    slug: `book-${uid()}`,
    price: 50000,
    fileFormat: 'PDF',
    status,
    authorId: authorId ?? null,
  });
}

function makeToken(userId: number, role: string) {
  return signAccessToken({ id: userId, role });
}

describe('Admin Products API', () => {
  let admin: User;
  let manager: User;
  let vendorUser: User;
  let vendorUser2: User;
  let normalUser: User;
  let vendorRecord: Vendor;
  let author: Author;
  let bookPublished: Book;
  let bookDraft: Book;
  let bookHidden: Book;
  let bookVendor2: Book;

  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    admin = await seedUser('admin', 'ap-a');
    manager = await seedUser('manager', 'ap-m');
    vendorUser = await seedUser('vendor', 'ap-v');
    vendorUser2 = await seedUser('vendor', 'ap-v2');
    normalUser = await seedUser('user', 'ap-u');

    vendorRecord = await seedVendor(vendorUser.id, 'APShop');
    await seedVendor(vendorUser2.id, 'APShop2');

    author = await seedAuthor('APAuthor');

    bookPublished = await seedBook(vendorUser.id, 'published', author.id);
    bookDraft = await seedBook(vendorUser.id, 'draft');
    bookHidden = await seedBook(vendorUser.id, 'hidden');
    bookVendor2 = await seedBook(vendorUser2.id, 'published');

    adminToken = makeToken(admin.id, 'admin');
    managerToken = makeToken(manager.id, 'manager');
    userToken = makeToken(normalUser.id, 'user');
  });

  // ── AP1: admin GET /admin/products → 200 paginated + DTO fields ──────────
  it('AP1. admin lists products — 200, paginated, DTO fields present', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta?.pagination).toBeDefined();

    const found = res.body.data.find((p: any) => p.id === Number(bookPublished.id));
    expect(found).toBeDefined();
    expect(found).toHaveProperty('id');
    expect(found).toHaveProperty('title');
    expect(found).toHaveProperty('slug');
    expect(found).toHaveProperty('vendorShop');
    expect(found).toHaveProperty('authorName');
    expect(found).toHaveProperty('price');
    expect(found).toHaveProperty('status');
    expect(found).toHaveProperty('fileFormat');
    expect(found).toHaveProperty('createdAt');
  });

  // ── AP2: manager GET /admin/products → 200 ───────────────────────────────
  it('AP2. manager lists products — 200 OK', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── AP3: plain user → 403 ────────────────────────────────────────────────
  it('AP3. plain user GET /admin/products → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  // ── AP4: filter by status=published ──────────────────────────────────────
  it('AP4. filter by status=published — only published books', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products?status=published')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const p of res.body.data) {
      expect(p.status).toBe('published');
    }
    // draft and hidden should NOT appear
    const foundDraft = res.body.data.find((p: any) => p.id === Number(bookDraft.id));
    const foundHidden = res.body.data.find((p: any) => p.id === Number(bookHidden.id));
    expect(foundDraft).toBeUndefined();
    expect(foundHidden).toBeUndefined();
  });

  // ── AP5: filter by vendorUserId ───────────────────────────────────────────
  it('AP5. filter by vendorUserId — only that vendor books', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/products?vendorUserId=${vendorUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const p of res.body.data) {
      // All returned books should belong to vendorUser (not vendorUser2)
      const notFromVendor2 = p.id !== Number(bookVendor2.id);
      // This test checks that bookVendor2 is not in results
    }
    const foundV2 = res.body.data.find((p: any) => p.id === Number(bookVendor2.id));
    expect(foundV2).toBeUndefined();
    // bookPublished from vendorUser should be present
    const found = res.body.data.find((p: any) => p.id === Number(bookPublished.id));
    expect(found).toBeDefined();
  });

  // ── AP6: PATCH /admin/products/:id/status { status: 'hidden' } → 200 ─────
  it('AP6. PATCH /admin/products/:id/status { status: hidden } — 200, DB updated', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${bookPublished.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'hidden' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('hidden');

    // Verify DB
    const dbBook = await Book.findByPk(bookPublished.id);
    expect(dbBook!.status).toBe('hidden');
  });

  // ── AP7: PATCH /admin/products/:id/status { status: 'published' } → 200 ──
  it('AP7. PATCH /admin/products/:id/status { status: published } — 200, DB updated', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${bookPublished.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');

    const dbBook = await Book.findByPk(bookPublished.id);
    expect(dbBook!.status).toBe('published');
  });

  // ── AP8: PATCH status=draft → 422 ────────────────────────────────────────
  it('AP8. PATCH /admin/products/:id/status { status: draft } → 422 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${bookPublished.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'draft' });

    expect(res.status).toBe(422);
  });

  // ── AP9: PATCH status=foo → 422 ──────────────────────────────────────────
  it('AP9. PATCH /admin/products/:id/status { status: foo } → 422 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${bookPublished.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'foo' });

    expect(res.status).toBe(422);
  });

  // ── AP10: plain user PATCH → 403 ─────────────────────────────────────────
  it('AP10. plain user PATCH /admin/products/:id/status → 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${bookPublished.id}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'hidden' });

    expect(res.status).toBe(403);
  });
});
