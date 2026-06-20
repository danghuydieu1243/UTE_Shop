import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Author extends Model<InferAttributes<Author>, InferCreationAttributes<Author>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: CreationOptional<string | null>;
  declare bio: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

Author.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(160), allowNull: true, unique: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'authors',
    updatedAt: false,
  },
);
