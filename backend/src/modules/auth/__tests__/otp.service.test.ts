jest.mock('../auth.repository');
jest.mock('../../../shared/email/mailer');
import * as repo from '../auth.repository';
import * as otpService from '../otp.service';

const mockRepo = repo as jest.Mocked<typeof repo>;
const baseOtp = () => ({ id: 1, email: 'a@b.com', purpose: 'register', attempts: 0, expiresAt: new Date(Date.now() + 600000), codeHash: otpService.hashOtp('123456'), resendAvailableAt: null } as any);

describe('otp.service', () => {
  it('verifyOtp consumes on correct code', async () => {
    mockRepo.findActiveOtp.mockResolvedValue(baseOtp());
    await otpService.verifyOtp({ email: 'a@b.com', purpose: 'register', code: '123456' });
    expect(mockRepo.consumeOtp).toHaveBeenCalledWith(1);
  });
  it('verifyOtp throws OTP_INVALID + increments on wrong code', async () => {
    mockRepo.findActiveOtp.mockResolvedValue(baseOtp());
    await expect(otpService.verifyOtp({ email: 'a@b.com', purpose: 'register', code: '000000' }))
      .rejects.toMatchObject({ code: 'OTP_INVALID' });
    expect(mockRepo.incrementOtpAttempts).toHaveBeenCalledWith(1);
  });
  it('verifyOtp throws OTP_EXPIRED', async () => {
    mockRepo.findActiveOtp.mockResolvedValue({ ...baseOtp(), expiresAt: new Date(Date.now() - 1000) });
    await expect(otpService.verifyOtp({ email: 'a@b.com', purpose: 'register', code: '123456' }))
      .rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });
  it('verifyOtp throws OTP_TOO_MANY_ATTEMPTS', async () => {
    mockRepo.findActiveOtp.mockResolvedValue({ ...baseOtp(), attempts: 5 });
    await expect(otpService.verifyOtp({ email: 'a@b.com', purpose: 'register', code: '123456' }))
      .rejects.toMatchObject({ code: 'OTP_TOO_MANY_ATTEMPTS' });
  });
  it('verifyOtp throws OTP_INVALID when no active otp', async () => {
    mockRepo.findActiveOtp.mockResolvedValue(null);
    await expect(otpService.verifyOtp({ email: 'a@b.com', purpose: 'register', code: '123456' }))
      .rejects.toMatchObject({ code: 'OTP_INVALID' });
  });
  it('issueOtp respects cooldown', async () => {
    mockRepo.findActiveOtp.mockResolvedValue({ ...baseOtp(), resendAvailableAt: new Date(Date.now() + 30000) });
    await expect(otpService.issueOtp({ email: 'a@b.com', purpose: 'register' }))
      .rejects.toMatchObject({ code: 'OTP_RESEND_COOLDOWN' });
  });
  it('issueOtp creates otp + sends email when no cooldown', async () => {
    mockRepo.findActiveOtp.mockResolvedValue(null);
    const res = await otpService.issueOtp({ email: 'a@b.com', purpose: 'register' });
    expect(mockRepo.createOtp).toHaveBeenCalled();
    expect(res.otpExpiresAt).toBeInstanceOf(Date);
  });
});
