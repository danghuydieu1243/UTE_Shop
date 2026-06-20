jest.mock('../shared/email/mailer');
import request from 'supertest';
import { sendOtpEmail } from '../shared/email/mailer';
import { createApp } from '../app';

const app = createApp();
const mockSend = sendOtpEmail as jest.Mock;
const lastCode = (): string => mockSend.mock.calls.at(-1)![1] as string;

describe('app integration', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('unknown route → 404 envelope', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'RESOURCE_NOT_FOUND' } });
  });

  it('register weak password → 422 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ accountType: 'user', email: 'w@x.com', password: 'weak', fullName: 'W' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('register → 201, duplicate → 409 EMAIL_TAKEN', async () => {
    const body = { accountType: 'user', email: 'dup@int.com', password: 'Abcd@1234', fullName: 'D' };
    const r1 = await request(app).post('/api/v1/auth/register').send(body);
    expect(r1.status).toBe(201);
    expect(r1.body.success).toBe(true);
    const r2 = await request(app).post('/api/v1/auth/register').send(body);
    expect(r2.status).toBe(409);
    expect(r2.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('full flow register → verify-otp → GET /auth/me', async () => {
    const email = 'flow@int.com';
    await request(app).post('/api/v1/auth/register')
      .send({ accountType: 'user', email, password: 'Abcd@1234', fullName: 'F' });
    const verify = await request(app).post('/api/v1/auth/verify-otp')
      .send({ email, purpose: 'register', code: lastCode() });
    expect(verify.status).toBe(200);
    const token = verify.body.data.accessToken as string;
    expect(token).toBeTruthy();
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });

  it('login pending user → 403 ACCOUNT_PENDING', async () => {
    const email = 'pend@int.com';
    await request(app).post('/api/v1/auth/register')
      .send({ accountType: 'user', email, password: 'Abcd@1234', fullName: 'P' });
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Abcd@1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_PENDING');
  });
});
