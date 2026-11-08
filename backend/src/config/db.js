import mongoose from 'mongoose';

/**
 * Mask sensitive credentials inside a MongoDB connection URI for safe logging.
 * 
 * @param {string} uri
 * @returns {string} Safe masked URI
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(
    /\/\/([^:]+):([^@]+)@/g,
    '//***:***@'
  );
};

/**
 * Check if MongoDB connection is active and ready.
 *
 * @returns {boolean}
 */
export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 *
 * @param {string} [connectionUri] - Optional URI override (used in tests)
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (connectionUri = process.env.MONGODB_URI) => {
  if (!connectionUri) {
    const errorMsg = 'MONGODB_URI environment variable is missing or empty. Database connection aborted.';
    console.error(`[DB Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const safeUri = maskMongoUri(connectionUri);

  try {
    // Configure Mongoose options for production readiness
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
      maxPoolSize: 10,               // Maintain up to 10 socket connections
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes automatically in non-production
    });

    console.log(`[DB] Connected to MongoDB: ${safeUri} (host: ${conn.connection.host})`);
    return conn;
  } catch (error) {
    console.error(`[DB Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully.
 *
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[DB] Disconnected from MongoDB');
    }
  } catch (error) {
    console.error(`[DB Error] Error during MongoDB disconnect: ${error.message}`);
  }
};

// Listen to connection events
mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[DB Warning] MongoDB connection lost');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[DB Error] MongoDB connection error: ${err.message}`);
});
