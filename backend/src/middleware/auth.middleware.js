import { sendError } from '../utils/api-response.js';
import { verifyToken } from '../utils/security.js';
import { User } from '../models/User.js';

/**
 * Middleware to authenticate requests via Bearer token in Authorization header or cookie.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    }

    // Check cookies if present
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/agenet_token=([^;]+)/);
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

    // Attach user information to request
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'client',
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
 * Restrict access to administrators only.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, {
      statusCode: 403,
      message: 'Access denied. Administrative privileges required.',
    });
  }
  next();
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
