'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      provider: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'sepay' },
      amount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'VND' },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'PENDING' },
      reference_code: { type: Sequelize.STRING(40), allowNull: false },
      qr_payload: { type: Sequelize.TEXT, allowNull: true },
      provider_txn_id: { type: Sequelize.STRING(80), allowNull: true, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('payments', { fields: ['order_id', 'status'], name: 'payments_order_status' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  },
};
