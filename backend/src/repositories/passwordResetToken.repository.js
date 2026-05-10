const { PasswordResetToken } = require('../models');

class PasswordResetTokenRepository {
  /**
   * Create new password reset token
   */
  static async create(userId, token, expiresAt) {
    try {
      const resetToken = await PasswordResetToken.create({
        user_id: userId,
        token,
        expires_at: expiresAt
      });
      return resetToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find token by token string
   */
  static async findByToken(token) {
    try {
      const resetToken = await PasswordResetToken.findOne({
        where: { token },
        include: [
          {
            model: require('../models/user.model'),
            as: 'user'
          }
        ]
      });
      return resetToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find valid token by token string (not expired)
   */
  static async findValidToken(token) {
    try {
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          expires_at: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        include: [
          {
            model: require('../models/user.model'),
            as: 'user'
          }
        ]
      });
      return resetToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete token by token string
   */
  static async deleteByToken(token) {
    try {
      const result = await PasswordResetToken.destroy({
        where: { token }
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete all tokens for a user
   */
  static async deleteByUserId(userId) {
    try {
      const result = await PasswordResetToken.destroy({
        where: { user_id: userId }
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete expired tokens (cleanup)
   */
  static async deleteExpired() {
    try {
      const result = await PasswordResetToken.destroy({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PasswordResetTokenRepository;
