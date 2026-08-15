// backend/src/middleware/rbac.middleware.js
const { forbidden } = require('../utils/response');

/**
 * Require a specific permission key.
 * Permission keys follow the pattern: module:action (e.g. 'users:create')
 */
const requirePermission = (permissionKey) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Not authenticated');

  if (!req.user.permissions.includes(permissionKey)) {
    return forbidden(res, `Missing permission: ${permissionKey}`);
  }

  next();
};

/**
 * Require any ONE of the given permissions
 */
const requireAnyPermission = (...keys) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Not authenticated');

  const hasAny = keys.some(k => req.user.permissions.includes(k));
  if (!hasAny) return forbidden(res, 'Insufficient permissions');

  next();
};

module.exports = { requirePermission, requireAnyPermission };
