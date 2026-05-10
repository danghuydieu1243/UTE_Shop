const { User } = require('../models');

class UserRepository {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const user = await User.findOne({
        where: { email }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async create(userData) {
    try {
      const user = await User.create(userData);
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    try {
      const [affectedRows, [updatedUser]] = await User.update(updateData, {
        where: { id },
        returning: true
      });

      if (affectedRows === 0) {
        return null;
      }

      // Fetch updated user without password
      return await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user with password (used in reset password)
   */
  static async updatePassword(id, newPassword) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        return null;
      }

      user.password = newPassword;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserRepository;
