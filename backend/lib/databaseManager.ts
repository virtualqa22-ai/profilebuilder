import mongoose from 'mongoose';
import { logger } from './logger';
import { CircuitBreaker } from './circuitBreaker';

/**
 * Database connection management utility with connection pooling, health checks, and graceful shutdown.
 * Provides optimized MongoDB connection handling for production environments.
 */
/**
 * Circuit breaker for database connection resilience
 */
const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // Lower threshold for DB connections
  recoveryTimeout: 30000, // 30 seconds recovery time
  maxRetries: 2,
  baseDelay: 2000, // 2 seconds base delay
  maxDelay: 10000, // 10 seconds max delay
});


// Connection configuration with pooling options
const getConnectionOptions = (): mongoose.ConnectOptions => {
  const maxPoolSize = parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10);
  const minPoolSize = parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10);
  const maxIdleTimeMS = parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10);
  const serverSelectionTimeoutMS = parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10);

  return {
    maxPoolSize,
    minPoolSize,
    maxIdleTimeMS,
    serverSelectionTimeoutMS,
    bufferCommands: false, // Disable mongoose buffering for better control
  };
};

/**
 * Establishes MongoDB connection with optimized pooling settings.
 * @param uri MongoDB connection URI
 * @returns Promise resolving to mongoose instance
 */
export const connectDatabase = async (uri: string): Promise<typeof mongoose> => {
  if (!uri) {
    throw new Error('MongoDB URI is required for database connection');
  }

  const options = getConnectionOptions();

  try {
    logger.info('Attempting to connect to MongoDB with connection pooling', {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
    });

    const connection = await dbCircuitBreaker.execute(() => mongoose.connect(uri, options));

    // Set up connection event monitoring
    setupConnectionMonitoring();

    logger.info('Successfully connected to MongoDB with connection pooling enabled');
    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
};

/**
 * Sets up monitoring for database connection events.
 * Logs connection status changes for observability.
 */
const setupConnectionMonitoring = (): void => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error: error.message });
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('close', () => {
    logger.warn('MongoDB connection closed');
  });
};

/**
 * Performs health check on database connection.
 * @returns Object containing health status and connection details
 */
export const checkDatabaseHealth = (): {
  isHealthy: boolean;
  readyState: number;
} => {
  const readyState = mongoose.connection.readyState;
  const isHealthy = readyState === 1; // 1 = connected

  const healthInfo = {
    isHealthy,
    readyState,
  };

  logger.debug('Database health check performed', healthInfo);
  return healthInfo;
};

/**
 * Gracefully disconnects from MongoDB.
 * Should be called during application shutdown.
 * @param signal Optional shutdown signal for logging
 */
export const disconnectDatabase = async (signal?: string): Promise<void> => {
  try {
    logger.info('Initiating graceful database disconnection', { signal });

    await mongoose.disconnect();

    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error during database disconnection', { error: error.message });
    throw error;
  }
};

/**
 * Gets current connection pool statistics.
 * Useful for monitoring and debugging.
 */
export const getConnectionStats = (): {
  readyState: number;
} => {
  const stats = {
    readyState: mongoose.connection.readyState,
  };

  return stats;
};