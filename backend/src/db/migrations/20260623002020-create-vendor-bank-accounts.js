'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('vendor_bank_accounts', {
      id: { type: S.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      vendor_user_id: { type: S.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      bank_name: { type: S.STRING(100), allowNull: false },
      account_number: { type: S.STRING(40), allowNull: false },
      account_holder: { type: S.STRING(120), allowNull: false },
      is_default: { type: S.TINYINT, allowNull: false, defaultValue: 0 },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('vendor_bank_accounts', ['vendor_user_id', 'is_default']);
  },
  async down(q) { await q.dropTable('vendor_bank_accounts'); },
};
