import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare type: string;
  declare title: string;
  declare body: CreationOptional<string | null>;
  declare data: CreationOptional<object | null>;
  declare readAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    type: { type: DataTypes.STRING(16), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    data: { type: DataTypes.JSON, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
    created_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'notifications', updatedAt: false, createdAt: 'created_at' },
);
