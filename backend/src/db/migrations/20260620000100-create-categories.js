'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(120), allowNull: true, unique: true },
      parent_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT' },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('categories', { fields: ['slug'], name: 'categories_slug' });
    await queryInterface.addIndex('categories', { fields: ['parent_id'], name: 'categories_parent_id' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  },
};
