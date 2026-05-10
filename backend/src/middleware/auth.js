const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return require('../utils/response').errorResponse(
        res,
        'No token provided or invalid format',
        null,
        401
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return require('../utils/response').errorResponse(
        res,
        'Token is missing',
        null,
        401
      );
    }

    const decoded = jwt.verify(token, jwtConfig.secret);

    req.user = {
      id: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return require('../utils/response').errorResponse(
        res,
        'Token has expired',
        null,
        401
      );
    }

    return require('../utils/response').errorResponse(
      res,
      'Invalid or malformed token',
      null,
      401
    );
  }
};

module.exports = authenticate;
