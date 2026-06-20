'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendors', {
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      shop_name: { type: Sequelize.STRING(150), allowNull: false },
      shop_slug: { type: Sequelize.STRING(160), allowNull: true, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('vendors'); },
};
