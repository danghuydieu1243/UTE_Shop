require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
};
