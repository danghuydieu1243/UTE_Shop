import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: CreationOptional<string | null>;
  declare parentId: CreationOptional<number | null>;
  declare sortOrder: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

Category.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: true, unique: true },
    parentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'parent_id' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'categories',
    updatedAt: false,
  },
);
