import { isDatabaseConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

/**
 * Basic liveness check endpoint
 * GET /api/v1/health
 */
export const getHealth = (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Agency API is running',
  });
};

/**
 * Readiness check endpoint (verifies database connectivity without leaking internals)
 * GET /api/v1/health/ready
 */
export const getReadiness = (req, res) => {
  const dbReady = isDatabaseConnected();

  if (dbReady) {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Agency API and database are ready',
      data: { status: 'ready' },
    });
  }

  return sendError(res, {
    statusCode: 503,
    message: 'Agency API database is not ready',
    errors: [{ status: 'unready' }],
  });
};
