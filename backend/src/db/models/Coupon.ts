import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Coupon extends Model<InferAttributes<Coupon>, InferCreationAttributes<Coupon>> {
  declare id: CreationOptional<number>;
  declare vendorUserId: number;
  declare code: string;
  declare type: string;
  declare value: number;
  declare minOrder: CreationOptional<number>;
  declare maxUses: CreationOptional<number | null>;
  declare maxUsesPerUser: CreationOptional<number>;
  declare usedCount: CreationOptional<number>;
  declare startsAt: CreationOptional<Date | null>;
  declare endsAt: CreationOptional<Date | null>;
  declare status: CreationOptional<string>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Coupon.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
    code: { type: DataTypes.STRING(40), allowNull: false },
    type: { type: DataTypes.STRING(10), allowNull: false },
    value: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    minOrder: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0, field: 'min_order' },
    maxUses: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'max_uses' },
    maxUsesPerUser: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'max_uses_per_user' },
    usedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'used_count' },
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
    status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'scheduled' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'coupons',
    indexes: [
      { unique: true, fields: ['vendor_user_id', 'code'], name: 'coupons_vendor_user_id_code_unique' },
    ],
  },
);
