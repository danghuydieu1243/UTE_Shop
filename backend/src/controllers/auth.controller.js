const AuthService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');

class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  static async register(req, res) {
    try {
      const { email, password, full_name, phone } = req.body;

      const result = await AuthService.register({
        email,
        password,
        full_name,
        phone
      });

      return successResponse(
        res,
        'Registration successful. Please verify your email.',
        { userId: result.userId },
        201
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }

  /**
   * POST /api/v1/auth/verify-email
   */
  static async verifyEmail(req, res) {
    try {
      const { email, token } = req.body;

      const result = await AuthService.verifyEmail(email, token);

      return successResponse(
        res,
        'Email verified successfully'
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await AuthService.forgotPassword(email);

      return successResponse(
        res,
        'Password reset OTP sent to your email'
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const { email, token, new_password } = req.body;

      const result = await AuthService.resetPassword(email, token, new_password);

      return successResponse(
        res,
        'Password reset successful. You can now login.'
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      return successResponse(
        res,
        'Login successful',
        result,
        200
      );
    } catch (error) {
      return errorResponse(res, error.message, null, error.statusCode || 500);
    }
  }
}

module.exports = AuthController;
