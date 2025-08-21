const constants = require('../config/constants');

/**
 * Middleware to check if the authenticated user has admin privileges
 */
const adminMiddleware = (req, res, next) => {
  try {
    // Check if user exists and has admin role
    if (!req.user) {
      return res.status(401).json({
        status: 0,
        message: 'Authentication required'
      });
    }

    // Check if user has admin role
    if (req.user.role !== constants.USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        status: 0,
        message: 'Admin privileges required'
      });
    }

    // Check if user account is active
    if (req.user.accountStatus !== constants.ACCOUNT_STATUSES.ACTIVATED) {
      return res.status(403).json({
        status: 0,
        message: 'Account is not active'
      });
    }

    // Check if user is not deleted
    if (req.user.isDeleted) {
      return res.status(403).json({
        status: 0,
        message: 'Account has been deleted'
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      status: 0,
      message: 'Internal server error'
    });
  }
};

module.exports = adminMiddleware;
