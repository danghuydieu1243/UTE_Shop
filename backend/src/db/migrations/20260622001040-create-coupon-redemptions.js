'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('coupon_redemptions', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      coupon_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'coupons', key: 'id' },
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      discount_amount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('coupon_redemptions', {
      fields: ['coupon_id', 'order_id'],
      unique: true,
      name: 'coupon_redemptions_coupon_order_unique',
    });
    await queryInterface.addIndex('coupon_redemptions', {
      fields: ['coupon_id', 'user_id'],
      name: 'coupon_redemptions_coupon_user',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('coupon_redemptions');
  },
};
