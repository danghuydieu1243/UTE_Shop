import { Setting } from '../../../db/models';
import * as settings from '../settings.service';

afterEach(async () => { await Setting.destroy({ where: {} }); });

describe('computeCommission', () => {
  it('làm tròn xuống (floor)', () => {
    expect(settings.computeCommission(99, 1000)).toEqual({ fee: 9, net: 90 }); // floor(9.9)=9
  });
  it('gross=0 → fee 0', () => {
    expect(settings.computeCommission(0, 1000)).toEqual({ fee: 0, net: 0 });
  });
});

describe('getCommissionRateBps', () => {
  it('trả mặc định 1000 khi chưa cấu hình', async () => {
    expect(await settings.getCommissionRateBps()).toBe(settings.DEFAULT_COMMISSION_RATE_BPS);
    expect(settings.DEFAULT_COMMISSION_RATE_BPS).toBe(1000);
  });
  it('đọc đúng giá trị sau khi set', async () => {
    await settings.setCommissionRateBps(1500);
    expect(await settings.getCommissionRateBps()).toBe(1500);
  });
  it('trả mặc định khi value không phải số', async () => {
    await Setting.create({ key: 'commission_rate_bps', value: 'abc' });
    expect(await settings.getCommissionRateBps()).toBe(1000);
  });
});
