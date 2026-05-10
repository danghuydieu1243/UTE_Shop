const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

/**
 * @route   GET /api/v1/admin/profile
 * @desc    Get admin profile
 * @access  Private (admin only)
 */
router.get(
  '/profile',
  authenticate,
  authorize(['admin']),
  AdminController.getProfile
);

module.exports = router;
