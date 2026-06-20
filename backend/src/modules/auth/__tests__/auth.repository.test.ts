import * as repo from '../auth.repository';

describe('auth.repository', () => {
  it('createUser hides passwordHash by default, exposes with withSecret', async () => {
    const u = await repo.createUser({ email: 'a@b.com', passwordHash: 'hash123', role: 'user', fullName: 'A' });
    expect(u.id).toBeGreaterThan(0);
    const found = await repo.findUserByEmail('a@b.com');
    expect(found).not.toBeNull();
    expect((found as any).passwordHash).toBeUndefined();
    const withSecret = await repo.findUserByEmail('a@b.com', true);
    expect(withSecret!.passwordHash).toBe('hash123');
  });

  it('findActiveOtp returns latest non-consumed otp', async () => {
    const u = await repo.createUser({ email: 'otp@b.com', passwordHash: 'h', role: 'user', fullName: 'O' });
    await repo.createOtp({ userId: u.id, email: 'otp@b.com', purpose: 'register', codeHash: 'c1', expiresAt: new Date(Date.now() + 600000) });
    const otp = await repo.findActiveOtp('otp@b.com', 'register');
    expect(otp).not.toBeNull();
    await repo.consumeOtp(otp!.id);
    expect(await repo.findActiveOtp('otp@b.com', 'register')).toBeNull();
  });

  it('refresh token revoke works', async () => {
    const u = await repo.createUser({ email: 'r@b.com', passwordHash: 'h', role: 'user', fullName: 'R' });
    const t = await repo.createRefreshToken({ userId: u.id, tokenHash: 'th1', expiresAt: new Date(Date.now() + 600000) });
    await repo.revokeRefresh(t.id);
    const found = await repo.findRefreshByHash('th1');
    expect(found!.revokedAt).not.toBeNull();
  });
});
