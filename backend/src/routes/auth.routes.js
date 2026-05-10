const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const {
  registerValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  loginValidation
} = require('../middleware/validation');
const {
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter
} = require('../middleware/rateLimiter');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  registerLimiter,
  registerValidation,
  AuthController.register
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post(
  '/verify-email',
  verifyEmailValidation,
  AuthController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset OTP
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidation,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post(
  '/reset-password',
  resetPasswordValidation,
  AuthController.resetPassword
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginLimiter,
  loginValidation,
  AuthController.login
);

module.exports = router;
