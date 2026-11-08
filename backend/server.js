import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validate essential configuration before starting the HTTP server
 */
const validateEnvironment = () => {
  const missing = [];
  if (!process.env.MONGODB_URI) {
    missing.push('MONGODB_URI');
  }

  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing recommended environment variable(s): ${missing.join(', ')}`);
    if (NODE_ENV === 'production') {
      console.error('[Fatal] Production requires valid environment variables. Exiting.');
      process.exit(1);
    }
  }
};

let server;

const startServer = async () => {
  try {
    validateEnvironment();

    // Connect to database (fails clearly if invalid)
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn('[DB Warning] Running server without MONGODB_URI configured. Database operations will fail.');
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(` Pravyuk Agency Website Backend API`);
      console.log(` Environment : ${NODE_ENV}`);
      console.log(` Server Port : ${PORT}`);
      console.log(` Health URL  : http://localhost:${PORT}/api/v1/health`);
      console.log(` Leads URL   : http://localhost:${PORT}/api/v1/leads`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error(`[Server Fatal] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const handleShutdown = async (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);

  if (server) {
    server.close(async () => {
      console.log('[Shutdown] HTTP server closed.');
      await disconnectDB();
      console.log('[Shutdown] Clean shutdown completed.');
      process.exit(0);
    });

    // Force exit after 10 seconds if hanging
    setTimeout(() => {
      console.error('[Shutdown] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

// Process event handlers
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  process.exit(1);
});

// Start the server
startServer();
