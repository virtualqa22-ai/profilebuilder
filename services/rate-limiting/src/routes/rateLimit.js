// Rate limiting API routes for the rate limiting microservice
// Handles rate limit check and quota retrieval endpoints
// Integrates with circuit breaker, logging, and metrics

const express = require('express');
const { v4: uuidv4 } = require('uuid'); // For correlation IDs, but since no third-party, generate simple IDs

const { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants');
const { createRateLimit, validateRateLimitParams } = require('../models/RateLimit');
const { canExecute, recordSuccess, recordFailure } = require('../utils/circuitBreaker');
const { info, error, logRequestStart, logRequestComplete, logRateLimitCheck } = require('../utils/logger');
const { recordRequest } = require('../utils/metrics');

// Create Express router
const router = express.Router();

/**
 * Generate a simple correlation ID
 * @returns {string} - Correlation ID
 */
function generateCorrelationId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * Middleware to add correlation ID to request
 */
router.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

/**
 * Middleware to log requests and measure duration
 */
router.use((req, res, next) => {
  const startTime = process.hrtime.bigint();
  logRequestStart(req.method, req.originalUrl, req.correlationId);

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds
    logRequestComplete(req.method, req.originalUrl, res.statusCode, duration, req.correlationId);
    recordRequest(true, duration); // Assuming success for now, adjust based on status
  });

  next();
});

/**
 * POST /api/v1/rate-limit/check
 * Check if a request is allowed based on rate limits
 */
router.post('/check', async (req, res) => {
  try {
    const { userId, endpoint } = req.body;

    // Validate input
    if (!validateRateLimitParams(userId, endpoint)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.INVALID_REQUEST,
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_REQUEST],
      });
    }

    // Check circuit breaker
    if (!canExecute()) {
      recordFailure();
      logRateLimitCheck(userId, endpoint, false, req.correlationId);
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        error: ERROR_CODES.CIRCUIT_BREAKER_OPEN,
        message: ERROR_MESSAGES[ERROR_CODES.CIRCUIT_BREAKER_OPEN],
      });
    }

    // Create rate limit instance
    const rateLimit = createRateLimit(userId, endpoint);

    // Check rate limit
    const allowed = await rateLimit.isAllowed(req.app.locals.redisClient);

    if (allowed) {
      recordSuccess();
      logRateLimitCheck(userId, endpoint, true, req.correlationId);
      return res.status(HTTP_STATUS.OK).json({
        allowed: true,
        message: SUCCESS_MESSAGES.REQUEST_ALLOWED,
      });
    } else {
      recordFailure();
      logRateLimitCheck(userId, endpoint, false, req.correlationId);
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        allowed: false,
        error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
      });
    }

  } catch (err) {
    error('Rate limit check failed', { error: err.message }, req.correlationId);
    recordFailure();
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    });
  }
});

/**
 * GET /api/v1/rate-limit/quota/:userId/:endpoint
 * Get current quota information for a user and endpoint
 */
router.get('/quota/:userId/:endpoint', async (req, res) => {
  try {
    const { userId, endpoint } = req.params;

    // Validate input
    if (!validateRateLimitParams(userId, endpoint)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.INVALID_REQUEST,
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_REQUEST],
      });
    }

    // Check circuit breaker
    if (!canExecute()) {
      recordFailure();
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        error: ERROR_CODES.CIRCUIT_BREAKER_OPEN,
        message: ERROR_MESSAGES[ERROR_CODES.CIRCUIT_BREAKER_OPEN],
      });
    }

    // Create rate limit instance
    const rateLimit = createRateLimit(userId, endpoint);

    // Get quota
    const quota = await rateLimit.getQuota(req.app.locals.redisClient);

    recordSuccess();
    return res.status(HTTP_STATUS.OK).json(quota);

  } catch (err) {
    error('Quota retrieval failed', { error: err.message }, req.correlationId);
    recordFailure();
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    });
  }
});

// Export the router
module.exports = router;