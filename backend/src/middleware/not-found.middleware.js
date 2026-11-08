import { sendError } from '../utils/api-response.js';

/**
 * Handle 404 Not Found for unmatched routes
 */
export const notFoundMiddleware = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};
