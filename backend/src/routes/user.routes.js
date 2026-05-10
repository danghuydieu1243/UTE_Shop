const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get user profile
 * @access  Private (user, admin)
 */
router.get(
  '/profile',
  authenticate,
  authorize(['user', 'admin']),
  UserController.getProfile
);

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile
 * @access  Private (user, admin)
 */
router.put(
  '/profile',
  authenticate,
  authorize(['user', 'admin']),
  UserController.updateProfile
);

module.exports = router;
