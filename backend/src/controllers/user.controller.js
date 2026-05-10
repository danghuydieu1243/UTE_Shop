const UserRepository = require('../repositories/user.repository');
const { successResponse, errorResponse } = require('../utils/response');

class UserController {
  /**
   * GET /api/v1/user/profile
   */
  static async getProfile(req, res) {
    try {
      const user = await UserRepository.findById(req.user.id);

      if (!user) {
        return errorResponse(res, 'User not found', null, 404);
      }

      return successResponse(
        res,
        'Profile retrieved successfully',
        user
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }

  /**
   * PUT /api/v1/user/profile
   */
  static async updateProfile(req, res) {
    try {
      const { full_name, phone } = req.body;

      const user = await UserRepository.update(req.user.id, {
        full_name,
        phone
      });

      if (!user) {
        return errorResponse(res, 'User not found', null, 404);
      }

      return successResponse(
        res,
        'Profile updated successfully',
        user
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }
}

module.exports = UserController;
