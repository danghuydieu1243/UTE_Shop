'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('settings', {
      key: { type: S.STRING(64), primaryKey: true },
      value: { type: S.STRING(255), allowNull: false },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(q) { await q.dropTable('settings'); },
};
