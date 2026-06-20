import { sequelize } from '../../shared/db/sequelize';
import { User } from './User';
import { Vendor } from './Vendor';
import { OtpCode } from './OtpCode';
import { RefreshToken } from './RefreshToken';
import { AuditLog } from './AuditLog';
import { Category } from './Category';
import { Author } from './Author';
import { Publisher } from './Publisher';
import { Book } from './Book';
import { BookImage } from './BookImage';
import { BookFile } from './BookFile';

// ── Phase 1 Associations ────────────────────────────────────────────────────
User.hasOne(Vendor, { foreignKey: 'user_id', as: 'vendor', onDelete: 'RESTRICT' });
Vendor.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(OtpCode, { foreignKey: 'user_id' });
User.hasMany(RefreshToken, { foreignKey: 'user_id' });
RefreshToken.belongsTo(RefreshToken, { foreignKey: 'replaced_by', as: 'replacedByToken' });
User.hasMany(AuditLog, { foreignKey: 'actor_user_id' });

// ── Phase 2 Associations ────────────────────────────────────────────────────
// Category self-referential (parent)
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });

// Book → lookup tables
Book.belongsTo(User, { foreignKey: 'vendor_user_id', as: 'vendor' });
User.hasMany(Book, { foreignKey: 'vendor_user_id', as: 'books' });

Book.belongsTo(Author, { foreignKey: 'author_id', as: 'author' });
Author.hasMany(Book, { foreignKey: 'author_id', as: 'books' });

Book.belongsTo(Publisher, { foreignKey: 'publisher_id', as: 'publisher' });
Publisher.hasMany(Book, { foreignKey: 'publisher_id', as: 'books' });

Book.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Book, { foreignKey: 'category_id', as: 'books' });

// Book → related assets (CASCADE in DB; Sequelize just documents)
Book.hasMany(BookImage, { foreignKey: 'book_id', as: 'images', onDelete: 'CASCADE' });
BookImage.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

Book.hasOne(BookFile, { foreignKey: 'book_id', as: 'file', onDelete: 'CASCADE' });
BookFile.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

export { sequelize, User, Vendor, OtpCode, RefreshToken, AuditLog, Category, Author, Publisher, Book, BookImage, BookFile };
