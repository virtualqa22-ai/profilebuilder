// Health check route for the rate limiting microservice
// Provides basic health status and dependency checks

const express = require('express');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../constants');
const { getState } = require('../utils/circuitBreaker');

// Create Express router
const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint
 * Returns 200 if service is healthy, 503 if unhealthy
 */
router.get('/', async (req, res) => {
  try {
    const redisClient = req.app.locals.redisClient;

    // Check Redis connection
    let redisHealthy = false;
    if (redisClient) {
      try {
        await redisClient.ping();
        redisHealthy = true;
      } catch (err) {
        redisHealthy = false;
      }
    }

    // Check circuit breaker state
    const circuitBreakerState = getState();

    // Determine overall health
    const isHealthy = redisHealthy && circuitBreakerState !== 'open';

    const healthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'rate-limiting-service',
      version: '1.0.0',
      dependencies: {
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          connected: redisHealthy,
        },
        circuitBreaker: {
          status: circuitBreakerState === 'open' ? 'unhealthy' : 'healthy',
          state: circuitBreakerState,
        },
      },
    };

    if (isHealthy) {
      res.status(HTTP_STATUS.OK).json(healthStatus);
    } else {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(healthStatus);
    }

  } catch (err) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'rate-limiting-service',
      error: 'Health check failed',
    });
  }
});

// Export the router
module.exports = router;