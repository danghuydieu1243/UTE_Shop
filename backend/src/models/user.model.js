const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      name: 'unique_email',
      msg: 'Email already exists'
    },
    validate: {
      isEmail: {
        msg: 'Please provide a valid email'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  underscored: true
});

module.exports = User;
