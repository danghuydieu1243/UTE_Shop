'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loyalty_accounts', {
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      balance_points: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('loyalty_accounts');
  },
};
