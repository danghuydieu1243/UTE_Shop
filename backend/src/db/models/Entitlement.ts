import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Entitlement extends Model<InferAttributes<Entitlement>, InferCreationAttributes<Entitlement>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare bookId: number;
  declare orderId: number;
  declare grantedAt: Date;
}

Entitlement.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' },
    grantedAt: { type: DataTypes.DATE, allowNull: false, field: 'granted_at' },
  },
  {
    sequelize,
    tableName: 'entitlements',
    timestamps: false,
  },
);
