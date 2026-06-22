import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class CouponRedemption extends Model<InferAttributes<CouponRedemption>, InferCreationAttributes<CouponRedemption>> {
  declare id: CreationOptional<number>;
  declare couponId: number;
  declare userId: number;
  declare orderId: number;
  declare discountAmount: number;
  declare created_at: CreationOptional<Date>;
}

CouponRedemption.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    couponId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'coupon_id' },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' },
    discountAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'discount_amount' },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'coupon_redemptions',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
