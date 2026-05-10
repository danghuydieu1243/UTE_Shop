const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

class TokenService {
  /**
   * Generate JWT token for user
   */
  static generateToken(userId, role) {
    try {
      const payload = {
        userId,
        role
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn
      });

      return token;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      return decoded;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TokenService;
