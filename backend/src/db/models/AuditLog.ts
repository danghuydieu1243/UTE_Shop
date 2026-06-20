import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare actorUserId: CreationOptional<number | null>;
  declare action: string;
  declare entityType: CreationOptional<string | null>;
  declare entityId: CreationOptional<number | null>;
  declare metadata: CreationOptional<unknown>;
  declare ip: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    actorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'actor_user_id' },
    action: { type: DataTypes.STRING(64), allowNull: false },
    entityType: { type: DataTypes.STRING(40), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'entity_id' },
    metadata: { type: DataTypes.JSON, allowNull: true },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
  },
);
