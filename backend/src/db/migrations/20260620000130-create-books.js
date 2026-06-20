'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('books', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      vendor_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      slug: { type: Sequelize.STRING(280), allowNull: true, unique: true },
      author_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'authors', key: 'id' },
        onDelete: 'RESTRICT',
      },
      publisher_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'publishers', key: 'id' },
        onDelete: 'RESTRICT',
      },
      category_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onDelete: 'RESTRICT',
      },
      description: { type: Sequelize.TEXT('medium'), allowNull: true },
      price: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'VND' },
      file_format: { type: Sequelize.STRING(8), allowNull: false },
      file_size_bytes: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      cover_image_url: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'draft' },
      purchase_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      view_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      rating_avg: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      rating_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      original_price: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      table_of_contents: { type: Sequelize.TEXT, allowNull: true },
      published_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('books', { fields: ['vendor_user_id', 'status'], name: 'books_vendor_status' });
    await queryInterface.addIndex('books', { fields: ['category_id'], name: 'books_category_id' });
    await queryInterface.addIndex('books', { fields: ['author_id'], name: 'books_author_id' });
    await queryInterface.addIndex('books', { fields: ['publisher_id'], name: 'books_publisher_id' });
    await queryInterface.addIndex('books', { fields: ['status', 'published_at'], name: 'books_status_published_at' });
    await queryInterface.addIndex('books', { fields: ['file_format'], name: 'books_file_format' });
    await queryInterface.addIndex('books', { fields: ['price'], name: 'books_price' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('books');
  },
};
