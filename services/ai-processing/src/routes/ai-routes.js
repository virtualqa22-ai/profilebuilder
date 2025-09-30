// AI Processing API Routes
// Provides REST endpoints for AI processing operations

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { aiService } = require('../models/ai-model');
const { validateRequest, sanitizeInput, rateLimiter } = require('../utils/validation');
const { handleError } = require('../utils/error-handling');
const { validateContent, sanitizeForLogging } = require('../utils/security');
const { metricsTracker } = require('../utils/performance');
const { info: logInfo, error: logError } = require('../utils/logger');
const { API_ENDPOINTS, MESSAGES } = require('../utils/constants');

const router = express.Router();

/**
 * Middleware to generate correlation ID for request tracking
 */
router.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

/**
 * Middleware for request logging
 */
router.use((req, res, next) => {
  const startTime = Date.now();
  logInfo('API request started', {
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
  });

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsTracker.trackRequest(responseTime, res.statusCode < 400);

    logInfo('API request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      correlationId: req.correlationId,
    });
  });

  next();
});

/**
 * POST /api/ai/process
 * Process text with AI model
 */
router.post('/process', async (req, res) => {
  try {
    const { text, task, maxTokens, options = {} } = req.body;

    // Validate request
    const validationErrors = validateRequest({ text, task });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
        correlationId: req.correlationId,
      });
    }

    // Sanitize input
    const sanitizedText = sanitizeInput(text);

    // Validate content security
    const contentValidation = validateContent(sanitizedText);
    if (!contentValidation.valid) {
      return res.status(400).json({
        success: false,
        error: contentValidation.reason,
        correlationId: req.correlationId,
      });
    }

    // Check rate limit
    const rateLimitResult = rateLimiter.checkRateLimit(req.ip || 'anonymous');
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime,
        correlationId: req.correlationId,
      });
    }

    // Process with AI
    const result = await aiService.processText(sanitizedText, {
      task,
      maxTokens,
      ...options,
    });

    res.json({
      success: true,
      data: result,
      correlationId: req.correlationId,
    });

  } catch (error) {
    const errorResponse = handleError(error, 'AI processing', {
      correlationId: req.correlationId,
      endpoint: '/process',
    });

    res.status(error.code === 'VALIDATION_ERROR' ? 400 : 500).json({
      ...errorResponse,
      correlationId: req.correlationId,
    });
  }
});

/**
 * POST /api/ai/process-batch
 * Process multiple texts in batch
 */
router.post('/process-batch', async (req, res) => {
  try {
    const { items, options = {} } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items must be a non-empty array',
        correlationId: req.correlationId,
      });
    }

    // Validate and sanitize each item
    const validatedItems = [];
    for (const item of items) {
      const validationErrors = validateRequest(item);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid item ${item.id || 'unknown'}: ${validationErrors.join(', ')}`,
          correlationId: req.correlationId,
        });
      }

      validatedItems.push({
        ...item,
        text: sanitizeInput(item.text),
      });
    }

    // Process batch
    const { processBatch } = require('../utils/error-handling');
    const batchResult = await processBatch(
      validatedItems,
      async (item) => {
        return await aiService.processText(item.text, {
          task: item.task,
          ...options,
        });
      }
    );

    res.json({
      success: true,
      data: batchResult,
      correlationId: req.correlationId,
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Batch processing', {
      correlationId: req.correlationId,
      endpoint: '/process-batch',
    });

    res.status(500).json({
      ...errorResponse,
      correlationId: req.correlationId,
    });
  }
});

/**
 * POST /api/ai/validate
 * Validate content without processing
 */
router.post('/validate', (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
        correlationId: req.correlationId,
      });
    }

    const sanitizedText = sanitizeInput(text);
    const validation = validateContent(sanitizedText);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        reason: validation.reason,
        sanitizedLength: sanitizedText.length,
      },
      correlationId: req.correlationId,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      correlationId: req.correlationId,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'ai-processing-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  };

  res.json(health);
});

/**
 * GET /metrics
 * Performance metrics endpoint
 */
router.get('/metrics', (req, res) => {
  const metrics = metricsTracker.getMetrics();

  res.json({
    service: 'ai-processing-service',
    metrics: sanitizeForLogging(metrics),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logError('Unhandled route error', {
    error: error.message,
    stack: error.stack,
    correlationId: req.correlationId,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    correlationId: req.correlationId,
  });
});

module.exports = router;