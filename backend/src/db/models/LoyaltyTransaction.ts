import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class LoyaltyTransaction extends Model<InferAttributes<LoyaltyTransaction>, InferCreationAttributes<LoyaltyTransaction>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare type: string;
  declare points: number;
  declare orderId: CreationOptional<number | null>;
  declare reviewId: CreationOptional<number | null>;
  declare note: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

LoyaltyTransaction.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    type: { type: DataTypes.STRING(10), allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'order_id' },
    reviewId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'review_id' },
    note: { type: DataTypes.STRING(255), allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'loyalty_transactions',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
