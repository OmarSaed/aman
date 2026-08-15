// backend/src/middleware/auth.middleware.js
const { verifyAccess } = require('../config/jwt');
const { unauthorized }  = require('../utils/response');
const prisma = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token   = authHeader.split(' ')[1];
    const decoded = verifyAccess(token);

    if (!decoded || !decoded.sub) {
      return unauthorized(res, 'Invalid token payload');
    }

    // Attach full user context to request
    req.user = {
      id:          decoded.sub,
      email:       decoded.email,
      name:        decoded.name,
      roleId:      decoded.roleId,
      roleName:    decoded.roleName,
      uiShell:     decoded.uiShell,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = { authenticate };
