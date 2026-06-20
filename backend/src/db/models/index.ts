import { sequelize } from '../../shared/db/sequelize';
import { User } from './User';
import { Vendor } from './Vendor';
import { OtpCode } from './OtpCode';
import { RefreshToken } from './RefreshToken';
import { AuditLog } from './AuditLog';

// Associations
User.hasOne(Vendor, { foreignKey: 'user_id', as: 'vendor', onDelete: 'RESTRICT' });
Vendor.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(OtpCode, { foreignKey: 'user_id' });
User.hasMany(RefreshToken, { foreignKey: 'user_id' });
RefreshToken.belongsTo(RefreshToken, { foreignKey: 'replaced_by', as: 'replacedByToken' });
User.hasMany(AuditLog, { foreignKey: 'actor_user_id' });

export { sequelize, User, Vendor, OtpCode, RefreshToken, AuditLog };
