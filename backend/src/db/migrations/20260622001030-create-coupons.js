'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('coupons', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      vendor_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      code: { type: Sequelize.STRING(40), allowNull: false },
      type: { type: Sequelize.STRING(10), allowNull: false },
      value: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      min_order: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      max_uses: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      max_uses_per_user: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      used_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'scheduled' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('coupons', {
      fields: ['vendor_user_id', 'code'],
      unique: true,
      name: 'coupons_vendor_code_unique',
    });
    await queryInterface.addIndex('coupons', {
      fields: ['status', 'starts_at', 'ends_at'],
      name: 'coupons_status_starts_ends',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('coupons');
  },
};
