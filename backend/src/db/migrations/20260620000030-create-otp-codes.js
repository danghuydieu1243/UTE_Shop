'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_codes', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      email: { type: Sequelize.STRING(255), allowNull: false },
      purpose: { type: Sequelize.STRING(24), allowNull: false },
      code_hash: { type: Sequelize.STRING(255), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      attempts: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      resend_available_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('otp_codes', ['email', 'purpose']);
    await queryInterface.addIndex('otp_codes', ['expires_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('otp_codes'); },
};
