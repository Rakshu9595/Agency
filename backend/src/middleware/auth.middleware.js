import { sendError } from '../utils/api-response.js';
import { verifyToken } from '../utils/security.js';
import { User } from '../models/User.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

/**
 * Middleware to authenticate requests via Bearer token in Authorization header or cookie.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    }

    // 2. Check cookies if present (support pravyuk_token with fallback to legacy keys)
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:pravyuk_token|xevruniq_token|agenet_token)=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication required. Please sign in.',
      });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid or expired session. Please sign in again.',
      });
    }

    // Check account status if user exists
    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findById(payload.id).select('status role permissions');
    } else {
      user = memoryStore.findUserById(payload.id);
    }

    if (user && user.status === 'suspended') {
      return sendError(res, {
        statusCode: 403,
        message: 'Your account has been suspended. Please contact agency support.',
      });
    }

    // Attach user information to request
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: (user && user.role) || payload.role || 'client',
      permissions: (user && user.permissions) || payload.permissions || (payload.role === 'super_admin' ? ['*'] : []),
    };

    next();
  } catch (err) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authentication failed',
    });
  }
};

/**
 * Restrict access to administrative users (SUPER_ADMIN or ADMIN).
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !['super_admin', 'admin'].includes(req.user.role)) {
    return sendError(res, {
      statusCode: 403,
      message: 'Access denied. Administrative privileges required.',
    });
  }
  next();
};

/**
 * Restrict access strictly to SUPER_ADMIN.
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return sendError(res, {
      statusCode: 403,
      message: 'Access denied. Super Administrator privileges required.',
    });
  }
  next();
};

/**
 * Granular permission check middleware.
 * Super admins bypass all permission checks.
 *
 * @param {string} permission
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication required',
      });
    }

    // Super Admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }

    const perms = req.user.permissions || [];
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }

    return sendError(res, {
      statusCode: 403,
      message: `Access denied. Permission '${permission}' is required for this operation.`,
    });
  };
};

/**
 * Admin authentication middleware preserved for Phase 2 compatibility.
 */
export const requireAdminAuth = (req, res, next) => {
  return sendError(res, {
    statusCode: 501,
    message: 'Admin authentication and management are scheduled for Phase 2. Unsecured operations are disabled.',
    errors: [{ message: 'Phase 2 implementation required' }],
  });
};
