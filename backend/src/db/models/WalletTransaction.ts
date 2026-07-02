import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class WalletTransaction extends Model<InferAttributes<WalletTransaction>, InferCreationAttributes<WalletTransaction>> {
  declare id: CreationOptional<number>;
  declare vendorUserId: number;
  declare type: string;
  declare amount: number;
  declare orderId: CreationOptional<number | null>;
  declare withdrawalId: CreationOptional<number | null>;
  declare balanceAfter: CreationOptional<number | null>;
  declare grossAmount: CreationOptional<number | null>;
  declare feeAmount: CreationOptional<number | null>;
  declare commissionRateBps: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
}

WalletTransaction.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
  type: { type: DataTypes.STRING(20), allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'order_id' },
  withdrawalId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'withdrawal_id' },
  balanceAfter: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'balance_after' },
  grossAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'gross_amount' },
  feeAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'fee_amount' },
  commissionRateBps: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'commission_rate_bps' },
  created_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'wallet_transactions',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
});
