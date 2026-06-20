jest.mock('../../../shared/email/mailer');
import { sendOtpEmail } from '../../../shared/email/mailer';
import * as authService from '../auth.service';
import * as repo from '../auth.repository';

const mockSend = sendOtpEmail as jest.Mock;
const lastCode = (): string => mockSend.mock.calls.at(-1)![1] as string;

describe('auth.service register flow', () => {
  it('register user (pending) + verify activates + returns tokens + redirect /', async () => {
    const r = await authService.register({ accountType: 'user', email: 'u@x.com', password: 'Abcd@1234', fullName: 'U' });
    expect(r.email).toBe('u@x.com');
    expect(r.purpose).toBe('register');
    const v = await authService.verifyOtpRegister({ email: 'u@x.com', code: lastCode() });
    expect(v.user.status).toBe('active');
    expect(v.user.role).toBe('user');
    expect(v.accessToken).toBeTruthy();
    expect(v.refreshToken).toBeTruthy();
    expect(v.redirect).toBe('/');
  });

  it('register duplicate email throws EMAIL_TAKEN', async () => {
    await authService.register({ accountType: 'user', email: 'dup@x.com', password: 'Abcd@1234', fullName: 'D' });
    await expect(
      authService.register({ accountType: 'user', email: 'dup@x.com', password: 'Abcd@1234', fullName: 'D2' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('register vendor creates vendor row + redirect /vendor/dashboard', async () => {
    await authService.register({ accountType: 'vendor', email: 'v@x.com', password: 'Abcd@1234', fullName: 'V', shopName: 'Shop V' });
    const v = await authService.verifyOtpRegister({ email: 'v@x.com', code: lastCode() });
    expect(v.user.role).toBe('vendor');
    expect(v.redirect).toBe('/vendor/dashboard');
    const vendor = await repo.findVendorByUserId(v.user.id);
    expect(vendor).not.toBeNull();
    expect(vendor!.shopSlug).toBeTruthy();
  });
});
