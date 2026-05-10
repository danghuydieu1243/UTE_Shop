const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const PasswordResetToken = require('./passwordResetToken.model');

// Define associations
User.hasMany(PasswordResetToken, {
  foreignKey: 'user_id',
  as: 'passwordResetTokens'
});

PasswordResetToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = {
  sequelize,
  User,
  PasswordResetToken
};
