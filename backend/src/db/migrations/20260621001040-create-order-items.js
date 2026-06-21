'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'RESTRICT',
      },
      vendor_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      title_snapshot: { type: Sequelize.STRING(255), allowNull: false },
      unit_price: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('order_items', {
      fields: ['order_id', 'book_id'],
      unique: true,
      name: 'order_items_order_book_unique',
    });
    await queryInterface.addIndex('order_items', { fields: ['order_id'], name: 'order_items_order_id' });
    await queryInterface.addIndex('order_items', { fields: ['vendor_user_id'], name: 'order_items_vendor_user_id' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
