import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Vendor extends Model<InferAttributes<Vendor>, InferCreationAttributes<Vendor>> {
  declare userId: number;
  declare shopName: string;
  declare shopSlug: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Vendor.init(
  {
    userId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, field: 'user_id' },
    shopName: { type: DataTypes.STRING(150), allowNull: false, field: 'shop_name' },
    shopSlug: { type: DataTypes.STRING(160), allowNull: true, unique: true, field: 'shop_slug' },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'vendors',
  },
);
