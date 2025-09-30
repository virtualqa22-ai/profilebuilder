// Error handling and resilience patterns
// Provides retry logic, timeout handling, and batch processing with failure isolation

const { RETRY_CONFIG, MESSAGES } = require('./constants');
const { error: logError, info: logInfo } = require('./logger');

/**
 * Process operation with retry logic and exponential backoff
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - Result of the operation
 */
async function processWithRetry(operation, maxRetries = RETRY_CONFIG.RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        logInfo('Operation succeeded after retry', { attempt, maxRetries });
      }
      return result;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * RETRY_CONFIG.RETRY_DELAY;
        logError('Operation failed, retrying', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logError('Operation failed after all retries', {
    maxRetries,
    finalError: lastError.message,
  });
  throw lastError;
}

/**
 * Process operation with timeout
 * @param {Function} operation - The operation to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} - Result of the operation or timeout error
 */
async function processWithTimeout(operation, timeoutMs) {
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(MESSAGES.ERRORS.TIMEOUT)), timeoutMs)
    ),
  ]);
}

/**
 * Process batch of items with partial failure handling
 * Continues processing even if individual items fail
 * @param {Array} items - Array of items to process
 * @param {Function} processFn - Function to process each item
 * @returns {Promise<Object>} - Results summary with successes and failures
 */
async function processBatch(items, processFn) {
  const results = [];
  const errors = [];

  logInfo('Starting batch processing', { itemCount: items.length });

  for (const item of items) {
    try {
      const result = await processFn(item);
      results.push({
        id: item.id,
        result,
        success: true,
      });
    } catch (error) {
      logError('Batch item processing failed', {
        itemId: item.id,
        error: error.message,
      });

      errors.push({
        id: item.id,
        error: error.message,
        success: false,
      });
    }
  }

  const summary = {
    results: results.map(r => ({ id: r.id, result: r.result })),
    errors: errors.map(e => ({ id: e.id, error: e.error })),
    successCount: results.length,
    errorCount: errors.length,
    totalCount: items.length,
  };

  logInfo('Batch processing completed', {
    successCount: summary.successCount,
    errorCount: summary.errorCount,
    totalCount: summary.totalCount,
  });

  return summary;
}

/**
 * Create standardized error object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Error} - Standardized error object
 */
function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();

  return error;
}

/**
 * Handle errors with appropriate logging and formatting
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalData - Additional data for logging
 */
function handleError(error, context, additionalData = {}) {
  const errorData = {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  // Log based on error type
  if (error.code && error.code.includes('VALIDATION')) {
    logError('Validation error', errorData);
  } else if (error.code && error.code.includes('TIMEOUT')) {
    logError('Timeout error', errorData);
  } else if (error.code && error.code.includes('CIRCUIT_BREAKER')) {
    logError('Circuit breaker error', errorData);
  } else {
    logError('Unhandled error', errorData);
  }

  // Return standardized error response
  return {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} - Wrapped function
 */
function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error, context, { args: args.length });
    }
  };
}

module.exports = {
  processWithRetry,
  processWithTimeout,
  processBatch,
  createError,
  handleError,
  withErrorHandling,
};