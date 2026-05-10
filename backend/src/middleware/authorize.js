const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return require('../utils/response').errorResponse(
        res,
        'Authentication required',
        null,
        401
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return require('../utils/response').errorResponse(
        res,
        'Access forbidden. Insufficient permissions.',
        null,
        403
      );
    }

    next();
  };
};

module.exports = authorize;
