'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      replaced_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'refresh_tokens', key: 'id' },
        onDelete: 'SET NULL',
      },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id', 'revoked_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('refresh_tokens'); },
};
