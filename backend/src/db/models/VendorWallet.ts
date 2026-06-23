import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class VendorWallet extends Model<InferAttributes<VendorWallet>, InferCreationAttributes<VendorWallet>> {
  declare vendorUserId: number;
  declare availableBalance: CreationOptional<number>;
  declare pendingBalance: CreationOptional<number>;
  declare currency: CreationOptional<string>;
  declare updated_at: CreationOptional<Date>;
}

VendorWallet.init({
  vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, field: 'vendor_user_id' },
  availableBalance: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0, field: 'available_balance' },
  pendingBalance: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0, field: 'pending_balance' },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'VND' },
  updated_at: DataTypes.DATE,
}, { sequelize, tableName: 'vendor_wallets', timestamps: false, createdAt: false, updatedAt: 'updated_at' });
