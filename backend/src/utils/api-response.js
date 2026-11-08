/**
 * Standardized API response utilities
 */

export class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code
   * @param {Array|Object|null} errors - Detailed validation or field errors
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Format and send a standardized success response.
 *
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=200]
 * @param {string} options.message
 * @param {any} [options.data=null]
 */
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null }) => {
  const payload = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Format and send a standardized error response.
 *
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=500]
 * @param {string} options.message
 * @param {Array|Object|null} [options.errors=null]
 */
export const sendError = (res, { statusCode = 500, message = 'Internal Server Error', errors = null }) => {
  const payload = {
    success: false,
    message,
  };

  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};
