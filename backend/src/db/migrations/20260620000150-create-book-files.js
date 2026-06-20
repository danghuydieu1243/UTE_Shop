'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('book_files', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      book_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      storage_key: { type: Sequelize.STRING(500), allowNull: false },
      file_format: { type: Sequelize.STRING(8), allowNull: true },
      file_size_bytes: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      checksum: { type: Sequelize.STRING(64), allowNull: true },
      version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('book_files', { fields: ['book_id', 'version'], name: 'book_files_book_version' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('book_files');
  },
};
