'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('vendor_wallets', {
      vendor_user_id: { type: S.BIGINT.UNSIGNED, primaryKey: true, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      available_balance: { type: S.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      pending_balance: { type: S.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      currency: { type: S.STRING(3), allowNull: false, defaultValue: 'VND' },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(q) { await q.dropTable('vendor_wallets'); },
};
