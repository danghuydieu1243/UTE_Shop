import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class BookImage extends Model<InferAttributes<BookImage>, InferCreationAttributes<BookImage>> {
  declare id: CreationOptional<number>;
  declare bookId: number;
  declare url: string;
  declare alt: CreationOptional<string | null>;
  declare sortOrder: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

BookImage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    url: { type: DataTypes.STRING(500), allowNull: false },
    alt: { type: DataTypes.STRING(200), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'book_images',
    updatedAt: false,
  },
);
