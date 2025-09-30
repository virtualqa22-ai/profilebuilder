// Main application file for the rate limiting microservice
// Sets up Express server, Redis cluster connection, routes, and middleware
// Handles graceful shutdown and health monitoring

const express = require('express');
const { createClient } = require('redis');

const { DEFAULT_PORT, DEFAULT_REDIS_HOSTS, REDIS_AOF_ENABLED } = require('./constants');
const { info, error } = require('./utils/logger');
const { updateRedisConnectionStatus } = require('./utils/metrics');
const rateLimitRoutes = require('./routes/rateLimit');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');

// Load configuration from environment variables
const PORT = process.env.PORT || DEFAULT_PORT;
const REDIS_HOSTS = process.env.REDIS_HOSTS ? process.env.REDIS_HOSTS.split(',') : DEFAULT_REDIS_HOSTS;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create Express application
const app = express();

// Redis client setup
let redisClient;

/**
 * Initialize Redis cluster connection
 */
async function initializeRedis() {
  try {
    // Create Redis cluster client
    redisClient = createClient({
      cluster: {
        rootNodes: REDIS_HOSTS.map(host => {
          const [hostPart, portPart] = host.split(':');
          return {
            host: hostPart,
            port: parseInt(portPart) || 6379,
          };
        }),
        defaults: {
          password: REDIS_PASSWORD,
          lazyConnect: true,
        },
      },
      // Enable AOF persistence
      aof: REDIS_AOF_ENABLED,
    });

    // Connect to Redis
    await redisClient.connect();

    // Set up event handlers
    redisClient.on('ready', () => {
      info('Redis cluster connected successfully');
      updateRedisConnectionStatus(true);
    });

    redisClient.on('error', (err) => {
      error('Redis connection error', { error: err.message });
      updateRedisConnectionStatus(false);
    });

    redisClient.on('end', () => {
      info('Redis connection ended');
      updateRedisConnectionStatus(false);
    });

    // Store Redis client in app locals for routes to access
    app.locals.redisClient = redisClient;

  } catch (err) {
    error('Failed to initialize Redis', { error: err.message });
    updateRedisConnectionStatus(false);
    throw err;
  }
}

/**
 * Set up Express middleware
 */
function setupMiddleware() {
  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

/**
 * Set up API routes
 */
function setupRoutes() {
  // API routes
  app.use('/api/v1/rate-limit', rateLimitRoutes);

  // Health check route
  app.use('/health', healthRoutes);

  // Metrics route
  app.use('/metrics', metricsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  });
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize Redis first
    await initializeRedis();

    // Setup middleware and routes
    setupMiddleware();
    setupRoutes();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      info(`Rate limiting service started on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      info('SIGTERM received, shutting down gracefully');

      server.close(async () => {
        info('HTTP server closed');

        if (redisClient) {
          await redisClient.quit();
          info('Redis connection closed');
        }

        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      info('SIGINT received, shutting down gracefully');

      server.close(async () => {
        info('HTTP server closed');

        if (redisClient) {
          await redisClient.quit();
          info('Redis connection closed');
        }

        process.exit(0);
      });
    });

  } catch (err) {
    error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// Start the application
startServer();

// Export app for testing
module.exports = app;