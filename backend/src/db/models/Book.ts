import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Book extends Model<InferAttributes<Book>, InferCreationAttributes<Book>> {
  declare id: CreationOptional<number>;
  declare vendorUserId: number;
  declare title: string;
  declare slug: CreationOptional<string | null>;
  declare authorId: CreationOptional<number | null>;
  declare publisherId: CreationOptional<number | null>;
  declare categoryId: CreationOptional<number | null>;
  declare description: CreationOptional<string | null>;
  declare price: number;
  declare currency: CreationOptional<string>;
  declare fileFormat: string;
  declare fileSizeBytes: CreationOptional<number | null>;
  declare coverImageUrl: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare purchaseCount: CreationOptional<number>;
  declare viewCount: CreationOptional<number>;
  declare ratingAvg: CreationOptional<number>;
  declare ratingCount: CreationOptional<number>;
  declare publishedAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Book.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    vendorUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vendor_user_id' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(280), allowNull: true, unique: true },
    authorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'author_id' },
    publisherId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'publisher_id' },
    categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'category_id' },
    description: { type: DataTypes.TEXT('medium'), allowNull: true },
    price: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'VND' },
    fileFormat: { type: DataTypes.STRING(8), allowNull: false, field: 'file_format' },
    fileSizeBytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'file_size_bytes' },
    coverImageUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'cover_image_url' },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'draft' },
    purchaseCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'purchase_count' },
    viewCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'view_count' },
    ratingAvg: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0, field: 'rating_avg' },
    ratingCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'rating_count' },
    publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'books',
  },
);
