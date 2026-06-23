import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Withdrawal extends Model<InferAttributes<Withdrawal>, InferCreationAttributes<Withdrawal>> {
  declare id: CreationOptional<number>;
  declare vendorUserId: number;
  declare bankAccountId: number;
  declare amount: number;
  declare status: CreationOptional<string>;
  declare requestedAt: string;
  declare processedAt: CreationOptional<string | null>;
}

Withdrawal.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
  bankAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'bank_account_id' },
  amount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'processing' },
  requestedAt: { type: DataTypes.DATEONLY, allowNull: false, field: 'requested_at' },
  processedAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'processed_at' },
}, {
  sequelize,
  tableName: 'withdrawals',
  timestamps: false,
  createdAt: false,
  updatedAt: false,
});
