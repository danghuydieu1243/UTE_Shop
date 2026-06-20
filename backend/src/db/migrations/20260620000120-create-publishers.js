'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('publishers', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(160), allowNull: true, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('publishers', { fields: ['slug'], name: 'publishers_slug' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('publishers');
  },
};
