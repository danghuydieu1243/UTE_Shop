'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entitlements', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      book_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'RESTRICT',
      },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      granted_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('entitlements', {
      fields: ['user_id', 'book_id'],
      unique: true,
      name: 'entitlements_user_book_unique',
    });
    await queryInterface.addIndex('entitlements', { fields: ['user_id'], name: 'entitlements_user_id' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('entitlements');
  },
};
