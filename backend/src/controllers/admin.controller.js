const UserRepository = require('../repositories/user.repository');
const { successResponse, errorResponse } = require('../utils/response');

class AdminController {
  /**
   * GET /api/v1/admin/profile
   */
  static async getProfile(req, res) {
    try {
      const user = await UserRepository.findById(req.user.id);

      if (!user) {
        return errorResponse(res, 'Admin not found', null, 404);
      }

      return successResponse(
        res,
        'Admin profile retrieved successfully',
        user
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }
}

module.exports = AdminController;
