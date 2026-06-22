'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loyalty_transactions', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      type: { type: Sequelize.STRING(10), allowNull: false },
      points: { type: Sequelize.INTEGER, allowNull: false },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      review_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'reviews', key: 'id' },
        onDelete: 'RESTRICT',
      },
      note: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('loyalty_transactions', {
      fields: ['user_id', 'created_at'],
      name: 'loyalty_transactions_user_created_at',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('loyalty_transactions');
  },
};
