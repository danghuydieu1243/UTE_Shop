'use strict';
module.exports = {
  async up(q) {
    await q.bulkInsert('settings', [
      { key: 'commission_rate_bps', value: '1000', updated_at: new Date() },
    ]);
  },
  async down(q) {
    await q.bulkDelete('settings', { key: 'commission_rate_bps' });
  },
};
