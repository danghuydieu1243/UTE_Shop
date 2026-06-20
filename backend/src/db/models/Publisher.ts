import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Publisher extends Model<InferAttributes<Publisher>, InferCreationAttributes<Publisher>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

Publisher.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(160), allowNull: true, unique: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'publishers',
    updatedAt: false,
  },
);
