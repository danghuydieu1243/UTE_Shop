import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class VendorBankAccount extends Model<InferAttributes<VendorBankAccount>, InferCreationAttributes<VendorBankAccount>> {
  declare id: CreationOptional<number>;
  declare vendorUserId: number;
  declare bankName: string;
  declare accountNumber: string;
  declare accountHolder: string;
  declare isDefault: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

VendorBankAccount.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
  bankName: { type: DataTypes.STRING(100), allowNull: false, field: 'bank_name' },
  accountNumber: { type: DataTypes.STRING(40), allowNull: false, field: 'account_number' },
  accountHolder: { type: DataTypes.STRING(120), allowNull: false, field: 'account_holder' },
  isDefault: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, field: 'is_default' },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'vendor_bank_accounts',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
