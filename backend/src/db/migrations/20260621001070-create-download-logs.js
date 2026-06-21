'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('download_logs', {
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
      entitlement_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'entitlements', key: 'id' },
        onDelete: 'RESTRICT',
      },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      issued_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('download_logs');
  },
};
