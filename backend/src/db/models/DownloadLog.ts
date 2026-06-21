import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class DownloadLog extends Model<InferAttributes<DownloadLog>, InferCreationAttributes<DownloadLog>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare bookId: number;
  declare entitlementId: CreationOptional<number | null>;
  declare ip: CreationOptional<string | null>;
  declare issuedAt: CreationOptional<Date>;
}

DownloadLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    entitlementId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'entitlement_id' },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    issuedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'issued_at' },
  },
  {
    sequelize,
    tableName: 'download_logs',
    timestamps: false,
  },
);
