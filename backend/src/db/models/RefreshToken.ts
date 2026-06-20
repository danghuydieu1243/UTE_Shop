import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare replacedBy: CreationOptional<number | null>;
  declare userAgent: CreationOptional<string | null>;
  declare ip: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

RefreshToken.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    tokenHash: { type: DataTypes.STRING(255), allowNull: false, unique: true, field: 'token_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
    replacedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'replaced_by' },
    userAgent: { type: DataTypes.STRING(255), allowNull: true, field: 'user_agent' },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: true,
    updatedAt: false,
  },
);
