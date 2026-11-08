import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes.js';
import leadRoutes from './routes/lead.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import projectRoutes from './routes/project.routes.js';
import inquiryRoutes from './routes/inquiry.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import membershipRoutes from './routes/membership.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import contentRoutes from './routes/content.routes.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

/**
 * Build CORS origin allowlist from environment variables
 *
 * @returns {string[]}
 */
export const getAllowedOrigins = () => {
  const origins = new Set();

  if (process.env.FRONTEND_URL) {
    origins.add(process.env.FRONTEND_URL.trim().replace(/\/$/, ''));
  }

  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',')
      .map((item) => item.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  // Sensible local development and production defaults if none provided
  if (origins.size === 0) {
    origins.add('http://localhost:5500');
    origins.add('http://127.0.0.1:5500');
    origins.add('http://localhost:3000');
    origins.add('https://pravyuk.com');
  }

  return Array.from(origins);
};

export const createApp = () => {
  const app = express();

  // 1. Trust proxy when running behind reverse proxies (e.g. Render, Heroku)
  app.set('trust proxy', 1);

  // 2. Security HTTP headers via Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API server does not render HTML
    })
  );

  // 3. CORS configuration
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, server-to-server, Supertest)
        if (!origin) return callback(null, true);

        // Normalize origin without trailing slash
        const normalized = origin.replace(/\/$/, '');

        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }

        // In development, allow localhost/127.0.0.1 on any port for developer convenience
        if (process.env.NODE_ENV === 'development') {
          if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
            return callback(null, true);
          }
        }

        return callback(new Error(`Origin '${origin}' not permitted by CORS policy`), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // Cache preflight response for 24 hours
    })
  );

  // 4. Request body parsers with strict size limits and rawBody preservation for webhooks
  app.use(
    express.json({
      limit: '50kb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));

  // 5. Mount API routes under /api/v1
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/leads', leadRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/services', serviceRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/project-inquiries', inquiryRoutes);
  app.use('/api/v1/quotes', quoteRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/memberships', membershipRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 6. 404 handler for undefined endpoints
  app.use(notFoundMiddleware);

  // 7. Centralized error handling
  app.use(errorMiddleware);

  return app;
};

const app = createApp();
export default app;
