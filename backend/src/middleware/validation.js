const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    return require('../utils/response').errorResponse(
      res,
      'Validation failed',
      errorMessages,
      400
    );
  };
};

// Validation rules for each endpoint
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('full_name')
    .notEmpty()
    .trim()
    .withMessage('Full name is required')
    .isLength({ max: 255 })
    .withMessage('Full name cannot exceed 255 characters'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters')
];

const verifyEmailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('token')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .matches(/^\d+$/)
    .withMessage('OTP must contain only digits')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('token')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .matches(/^\d+$/)
    .withMessage('OTP must contain only digits'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Full name cannot exceed 255 characters'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters')
];

module.exports = {
  validate,
  registerValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  loginValidation,
  updateProfileValidation
};
