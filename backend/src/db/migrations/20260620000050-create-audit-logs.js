'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      actor_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      action: { type: Sequelize.STRING(64), allowNull: false },
      entity_type: { type: Sequelize.STRING(40), allowNull: true },
      entity_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['action', 'created_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('audit_logs'); },
};
