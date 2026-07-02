import request from 'supertest';
import { createApp } from '../../../app';
import { sequelize, User, Setting } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

let uidCounter = 0;
const uid = () => `${Date.now()}-${++uidCounter}-${Math.random().toString(36).slice(2)}`;

async function seedUser(role: 'user' | 'admin') {
  const u = await User.create({
    email: `${role}-${uid()}@test-settings.com`,
    passwordHash: 'hash', role, fullName: `Test ${role}`, status: 'active',
  });
  return signAccessToken({ id: Number(u.id), role });
}

afterEach(async () => { await Setting.destroy({ where: {} }); });

describe('GET/PATCH /admin/settings/commission', () => {
  it('admin đọc mặc định 10%', async () => {
    const token = await seedUser('admin');
    const res = await request(app)
      .get('/api/v1/admin/settings/commission')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ rateBps: 1000, ratePercent: 10 });
  });

  it('admin đổi thành 15%', async () => {
    const token = await seedUser('admin');
    const res = await request(app)
      .patch('/api/v1/admin/settings/commission')
      .set('Authorization', `Bearer ${token}`)
      .send({ ratePercent: 15 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ rateBps: 1500, ratePercent: 15 });
  });

  it('từ chối ratePercent ngoài [0,100]', async () => {
    const token = await seedUser('admin');
    const res = await request(app)
      .patch('/api/v1/admin/settings/commission')
      .set('Authorization', `Bearer ${token}`)
      .send({ ratePercent: 150 });
    expect(res.status).toBe(422);
  });

  it('user thường bị chặn (403)', async () => {
    const token = await seedUser('user');
    const res = await request(app)
      .get('/api/v1/admin/settings/commission')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
