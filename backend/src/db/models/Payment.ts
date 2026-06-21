import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare provider: CreationOptional<string>;
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<string>;
  declare referenceCode: string;
  declare qrPayload: CreationOptional<string | null>;
  declare providerTxnId: CreationOptional<string | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Payment.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' },
    provider: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'sepay' },
    amount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'VND' },
    status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'PENDING' },
    referenceCode: { type: DataTypes.STRING(40), allowNull: false, field: 'reference_code' },
    qrPayload: { type: DataTypes.TEXT, allowNull: true, field: 'qr_payload' },
    providerTxnId: { type: DataTypes.STRING(80), allowNull: true, unique: true, field: 'provider_txn_id' },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payments',
  },
);
