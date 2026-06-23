'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('withdrawals', {
      id: { type: S.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      vendor_user_id: { type: S.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      bank_account_id: { type: S.BIGINT.UNSIGNED, allowNull: false, references: { model: 'vendor_bank_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      amount: { type: S.BIGINT.UNSIGNED, allowNull: false },
      status: { type: S.STRING(12), allowNull: false, defaultValue: 'processing' },
      requested_at: { type: S.DATEONLY, allowNull: false },
      processed_at: { type: S.DATEONLY, allowNull: true },
    });
    await q.addIndex('withdrawals', ['vendor_user_id', 'status']);
  },
  async down(q) { await q.dropTable('withdrawals'); },
};
