import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Review extends Model<InferAttributes<Review>, InferCreationAttributes<Review>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare bookId: number;
  declare orderId: number;
  declare rating: number;
  declare comment: CreationOptional<string | null>;
  declare vendorReply: CreationOptional<string | null>;
  declare vendorRepliedAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Review.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' },
    rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    vendorReply: { type: DataTypes.TEXT, allowNull: true, field: 'vendor_reply' },
    vendorRepliedAt: { type: DataTypes.DATE, allowNull: true, field: 'vendor_replied_at' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'reviews',
    indexes: [
      { unique: true, fields: ['user_id', 'book_id'], name: 'reviews_user_id_book_id_unique' },
    ],
  },
);
