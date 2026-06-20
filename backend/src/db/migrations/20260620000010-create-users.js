'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(16), allowNull: false },
      full_name: { type: Sequelize.STRING(120), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'pending' },
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('users', {
      fields: [{ name: 'role' }, { name: 'status' }],
      name: 'users_role_status',
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('users'); },
};
