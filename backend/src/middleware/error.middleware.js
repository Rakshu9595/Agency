import { sendError, AppError } from '../utils/api-response.js';

/**
 * Global centralized error-handling middleware.
 */
export const errorMiddleware = (err, req, res, next) => {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Safe structured logging
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  if (!isTest) {
    console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.name || 'Error'}: ${err.message}`);
    if (!isProduction && err.stack) {
      console.error(err.stack);
    }
  }

  // 1. Handled operational AppError
  if (err instanceof AppError) {
    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // 2. Body Parser / Invalid JSON error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, {
      statusCode: 400,
      message: 'Malformed JSON payload in request body',
      errors: [{ message: err.message }],
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const formattedErrors = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    return sendError(res, {
      statusCode: 400,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // 4. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, {
      statusCode: 400,
      message: `Invalid format for field: ${err.path}`,
      errors: [{ field: err.path, message: `Cast to ${err.kind} failed` }],
    });
  }

  // 5. MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    return sendError(res, {
      statusCode: 409,
      message: `Duplicate value entered for ${field}`,
      errors: [{ field, message: `${field} must be unique` }],
    });
  }

  // 6. Generic or unexpected 500 error
  const genericMessage = isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  return sendError(res, {
    statusCode: 500,
    message: genericMessage,
  });
};
