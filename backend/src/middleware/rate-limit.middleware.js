import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/api-response.js';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;

/**
 * Custom rate limit handler returning standardized JSON response
 */
const rateLimitHandler = (req, res) => {
  return sendError(res, {
    statusCode: 429,
    message: 'Too many inquiries submitted from this IP address. Please try again later.',
    errors: [{ message: 'Rate limit exceeded' }],
  });
};

/**
 * Rate limiter specifically for public lead submissions (POST /api/v1/leads)
 */
export const leadSubmissionLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
});

/**
 * General rate limiter for broader API endpoints
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});
