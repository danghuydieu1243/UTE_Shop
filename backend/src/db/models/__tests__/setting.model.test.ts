import { Setting } from '../index';

// Lưu ý: `beforeAll(sync)` / `afterAll(close)` đã được xử lý toàn cục trong
// `src/shared/test/setup.ts` (setupFilesAfterEnv trong jest.config.js).
// Khai báo lại ở đây sẽ gọi `sequelize.close()` hai lần và gây lỗi
// "SQLITE_MISUSE: Database is closed" ở lần đóng thứ hai.

describe('Setting model', () => {
  it('lưu và đọc được một cặp key-value', async () => {
    await Setting.create({ key: 'commission_rate_bps', value: '1000' });
    const row = await Setting.findByPk('commission_rate_bps');
    expect(row).not.toBeNull();
    expect(row!.value).toBe('1000');
  });
});
