'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cart_items', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      cart_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'carts', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'RESTRICT',
      },
      unit_price: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      added_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('cart_items', {
      fields: ['cart_id', 'book_id'],
      unique: true,
      name: 'cart_items_cart_book_unique',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('cart_items');
  },
};
