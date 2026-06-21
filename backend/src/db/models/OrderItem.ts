import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class OrderItem extends Model<InferAttributes<OrderItem>, InferCreationAttributes<OrderItem>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare bookId: number;
  declare vendorUserId: number;
  declare titleSnapshot: string;
  declare unitPrice: number;
  declare created_at: CreationOptional<Date>;
}

OrderItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
    titleSnapshot: { type: DataTypes.STRING(255), allowNull: false, field: 'title_snapshot' },
    unitPrice: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'unit_price' },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'order_items',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
