'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('book_images', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      book_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      url: { type: Sequelize.STRING(500), allowNull: false },
      alt: { type: Sequelize.STRING(200), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('book_images', { fields: ['book_id', 'sort_order'], name: 'book_images_book_sort' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('book_images');
  },
};
