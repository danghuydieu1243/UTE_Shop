import * as tok from '../token.service';

describe('token.service', () => {
  it('sign+verify access roundtrip', () => {
    const t = tok.signAccessToken({ id: 5, role: 'vendor' });
    expect(tok.verifyAccessToken(t)).toEqual({ id: 5, role: 'vendor' });
  });
  it('verifyAccessToken throws on bad token', () => {
    expect(() => tok.verifyAccessToken('garbage')).toThrow();
  });
  it('hashToken stable + distinct', () => {
    expect(tok.hashToken('a')).toBe(tok.hashToken('a'));
    expect(tok.hashToken('a')).not.toBe(tok.hashToken('b'));
  });
  it('generateRefreshToken is random + long', () => {
    expect(tok.generateRefreshToken()).not.toBe(tok.generateRefreshToken());
    expect(tok.generateRefreshToken().length).toBeGreaterThanOrEqual(32);
  });
  it('redirectForRole maps roles', () => {
    expect(tok.redirectForRole('user')).toBe('/');
    expect(tok.redirectForRole('vendor')).toBe('/vendor/dashboard');
    expect(tok.redirectForRole('admin')).toBe('/admin/dashboard');
    expect(tok.redirectForRole('manager')).toBe('/admin/dashboard');
  });
  it('reset token roundtrip + reject access token as reset', () => {
    const r = tok.signResetToken('x@y.com');
    expect(tok.verifyResetToken(r)).toEqual({ email: 'x@y.com' });
    const a = tok.signAccessToken({ id: 1, role: 'user' });
    expect(() => tok.verifyResetToken(a)).toThrow();
  });
});
