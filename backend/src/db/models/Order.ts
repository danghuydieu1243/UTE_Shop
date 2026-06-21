import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare userId: number;
  declare status: CreationOptional<string>;
  declare subtotal: number;
  declare couponId: CreationOptional<number | null>;
  declare couponDiscount: CreationOptional<number>;
  declare pointsUsed: CreationOptional<number>;
  declare loyaltyDiscount: CreationOptional<number>;
  declare total: number;
  declare currency: CreationOptional<string>;
  declare completedAt: CreationOptional<Date | null>;
  declare cancelledAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Order.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'NEW' },
    subtotal: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    couponId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'coupon_id' },
    couponDiscount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0, field: 'coupon_discount' },
    pointsUsed: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'points_used' },
    loyaltyDiscount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0, field: 'loyalty_discount' },
    total: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'VND' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'orders',
  },
);
