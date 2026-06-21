import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class CartItem extends Model<InferAttributes<CartItem>, InferCreationAttributes<CartItem>> {
  declare id: CreationOptional<number>;
  declare cartId: number;
  declare bookId: number;
  declare unitPrice: number;
  declare addedAt: CreationOptional<Date>;
}

CartItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'cart_id' },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    unitPrice: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'unit_price' },
    addedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'added_at' },
  },
  {
    sequelize,
    tableName: 'cart_items',
    timestamps: false,
  },
);
