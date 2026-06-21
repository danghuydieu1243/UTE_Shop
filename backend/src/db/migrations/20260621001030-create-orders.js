'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'NEW' },
      subtotal: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      // coupon_id: Phase 4 — cột BIGINT NULL, KHÔNG FK (bảng coupons chưa tồn tại)
      coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      coupon_discount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      points_used: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      loyalty_discount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'VND' },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('orders', { fields: ['user_id', 'status'], name: 'orders_user_status' });
    await queryInterface.addIndex('orders', { fields: ['status', 'created_at'], name: 'orders_status_created_at' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
