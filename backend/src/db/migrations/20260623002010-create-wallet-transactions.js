'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('wallet_transactions', {
      id: { type: S.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      vendor_user_id: { type: S.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      type: { type: S.STRING(20), allowNull: false },
      amount: { type: S.BIGINT, allowNull: false },
      order_id: { type: S.BIGINT.UNSIGNED, allowNull: true, references: { model: 'orders', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      withdrawal_id: { type: S.BIGINT.UNSIGNED, allowNull: true },
      balance_after: { type: S.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wallet_transactions', ['vendor_user_id', 'created_at']);
  },
  async down(q) { await q.dropTable('wallet_transactions'); },
};
