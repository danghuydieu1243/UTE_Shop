const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message = 'Too many requests, please try again later') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Register: 5 requests per minute
const registerLimiter = createRateLimiter(
  60 * 1000,
  5,
  'Too many registration attempts, please try again later'
);

// Login: 5 requests per minute
const loginLimiter = createRateLimiter(
  60 * 1000,
  5,
  'Too many login attempts, please try again later'
);

// Forgot password: 3 requests per minute
const forgotPasswordLimiter = createRateLimiter(
  60 * 1000,
  3,
  'Too many password reset requests, please try again later'
);

module.exports = {
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter
};
