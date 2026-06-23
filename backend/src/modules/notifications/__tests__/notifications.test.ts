import request from 'supertest';
import { createApp } from '../../../app';
import { User, Notification } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function makeUser(role: 'user' | 'vendor' = 'user') {
  const u = await User.create({
    email: `n${Date.now()}${Math.random()}@e.com`, fullName: 'N', passwordHash: 'x',
    role, status: 'active',
  } as any);
  return { id: Number(u.id), token: signAccessToken({ id: Number(u.id), role }) };
}

describe('Notifications API', () => {
  it('NT1: GET /user/notifications trả mảng + meta.unreadCount', async () => {
    const u = await makeUser();
    await Notification.create({ userId: u.id, type: 'ebook', title: 'A' } as any);
    await Notification.create({ userId: u.id, type: 'order', title: 'B', readAt: new Date() } as any);
    const res = await request(app).get('/api/v1/user/notifications').set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.unreadCount).toBe(1);
    // DTO camelCase + không lộ user_id
    expect(res.body.data[0]).toHaveProperty('readAt');
    expect(res.body.data[0]).toHaveProperty('createdAt');
    expect(res.body.data[0]).not.toHaveProperty('user_id');
  });

  it('NT2: list mới→cũ (id DESC)', async () => {
    const u = await makeUser();
    const a = await Notification.create({ userId: u.id, type: 'order', title: 'first' } as any);
    const b = await Notification.create({ userId: u.id, type: 'order', title: 'second' } as any);
    const res = await request(app).get('/api/v1/user/notifications').set('Authorization', `Bearer ${u.token}`);
    expect(res.body.data[0].id).toBe(Number(b.id));
    expect(res.body.data[1].id).toBe(Number(a.id));
  });

  it('NT3: chỉ thấy notification của chính mình', async () => {
    const u1 = await makeUser(); const u2 = await makeUser();
    await Notification.create({ userId: u2.id, type: 'order', title: 'other' } as any);
    const res = await request(app).get('/api/v1/user/notifications').set('Authorization', `Bearer ${u1.token}`);
    expect(res.body.data.length).toBe(0);
  });

  it('NT4: GET /unread-count', async () => {
    const u = await makeUser();
    await Notification.create({ userId: u.id, type: 'order', title: 'A' } as any);
    const res = await request(app).get('/api/v1/user/notifications/unread-count').set('Authorization', `Bearer ${u.token}`);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it('NT5: PUT /:id/read đánh dấu đã đọc', async () => {
    const u = await makeUser();
    const n = await Notification.create({ userId: u.id, type: 'order', title: 'A' } as any);
    const res = await request(app).put(`/api/v1/user/notifications/${n.id}/read`).set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    const reloaded = await Notification.findByPk(n.id);
    expect(reloaded!.readAt).not.toBeNull();
  });

  it('NT6: PUT /:id/read của user khác → 404', async () => {
    const u1 = await makeUser(); const u2 = await makeUser();
    const n = await Notification.create({ userId: u2.id, type: 'order', title: 'A' } as any);
    const res = await request(app).put(`/api/v1/user/notifications/${n.id}/read`).set('Authorization', `Bearer ${u1.token}`);
    expect(res.status).toBe(404);
  });

  it('NT7: PUT /read-all đánh dấu tất cả', async () => {
    const u = await makeUser();
    await Notification.create({ userId: u.id, type: 'order', title: 'A' } as any);
    await Notification.create({ userId: u.id, type: 'order', title: 'B' } as any);
    const res = await request(app).put('/api/v1/user/notifications/read-all').set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    const cnt = await Notification.count({ where: { userId: u.id, readAt: null } });
    expect(cnt).toBe(0);
  });

  it('NT8: vendor role → 403 ở list', async () => {
    const v = await makeUser('vendor');
    const res = await request(app).get('/api/v1/user/notifications').set('Authorization', `Bearer ${v.token}`);
    expect(res.status).toBe(403);
  });

  it('NT9: PUT /:id/read lần 2 (đã đọc) vẫn 200 — idempotent', async () => {
    const u = await makeUser();
    const n = await Notification.create({ userId: u.id, type: 'order', title: 'A' } as any);
    const first = await request(app).put(`/api/v1/user/notifications/${n.id}/read`).set('Authorization', `Bearer ${u.token}`);
    expect(first.status).toBe(200);
    const second = await request(app).put(`/api/v1/user/notifications/${n.id}/read`).set('Authorization', `Bearer ${u.token}`);
    expect(second.status).toBe(200);
  });
});
