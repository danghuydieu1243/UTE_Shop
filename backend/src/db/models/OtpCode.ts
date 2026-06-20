import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class OtpCode extends Model<InferAttributes<OtpCode>, InferCreationAttributes<OtpCode>> {
  declare id: CreationOptional<number>;
  declare userId: CreationOptional<number | null>;
  declare email: string;
  declare purpose: string;
  declare codeHash: string;
  declare expiresAt: Date;
  declare attempts: CreationOptional<number>;
  declare consumedAt: CreationOptional<Date | null>;
  declare resendAvailableAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

OtpCode.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'user_id' },
    email: { type: DataTypes.STRING(255), allowNull: false },
    purpose: { type: DataTypes.STRING(24), allowNull: false },
    codeHash: { type: DataTypes.STRING(255), allowNull: false, field: 'code_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    attempts: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' },
    resendAvailableAt: { type: DataTypes.DATE, allowNull: true, field: 'resend_available_at' },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'otp_codes',
    timestamps: true,
    updatedAt: false,
  },
);
