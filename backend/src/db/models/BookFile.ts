import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class BookFile extends Model<InferAttributes<BookFile>, InferCreationAttributes<BookFile>> {
  declare id: CreationOptional<number>;
  declare bookId: number;
  declare storageKey: string;
  declare fileFormat: CreationOptional<string | null>;
  declare fileSizeBytes: CreationOptional<number | null>;
  declare checksum: CreationOptional<string | null>;
  declare version: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

BookFile.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    bookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'book_id' },
    storageKey: { type: DataTypes.STRING(500), allowNull: false, field: 'storage_key' },
    fileFormat: { type: DataTypes.STRING(8), allowNull: true, field: 'file_format' },
    fileSizeBytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'file_size_bytes' },
    checksum: { type: DataTypes.STRING(64), allowNull: true },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'book_files',
    updatedAt: false,
  },
);
