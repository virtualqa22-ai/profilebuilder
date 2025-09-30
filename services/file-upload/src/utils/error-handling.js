// Error handling and resilience patterns for file upload service
// Provides retry logic, timeout handling, and standardized error responses

const { MESSAGES, ERROR_CODES } = require('./constants');
const { error: logError, info: logInfo } = require('./logger');

/**
 * Process operation with retry logic and exponential backoff
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - Result of the operation
 */
async function processWithRetry(operation, maxRetries = 3) {
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
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff starting at 1 second
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
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Create standardized error object for file upload operations
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Error} - Standardized error object
 */
function createUploadError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();

  return error;
}

/**
 * Handle file upload errors with appropriate logging and formatting
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalData - Additional data for logging
 * @returns {Object} - Standardized error response
 */
function handleUploadError(error, context, additionalData = {}) {
  const errorData = {
    code: error.code || ERROR_CODES.INTERNAL_ERROR,
    message: error.message,
    context,
    timestamp: error.timestamp || new Date().toISOString(),
    ...additionalData,
  };

  // Log based on error type
  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    logError('File validation error', errorData);
  } else if (error.code === ERROR_CODES.SECURITY_ERROR) {
    logError('File security error', errorData);
  } else if (error.code === ERROR_CODES.STORAGE_ERROR) {
    logError('File storage error', errorData);
  } else if (error.code === ERROR_CODES.PROCESSING_ERROR) {
    logError('File processing error', errorData);
  } else {
    logError('File upload error', errorData);
  }

  // Return standardized error response
  return {
    success: false,
    error: {
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * Wrap async file upload function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} - Wrapped function
 */
function withUploadErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleUploadError(error, context, { args: args.length });
    }
  };
}

/**
 * Handle cleanup operations with error logging
 * @param {Function} cleanupFn - Cleanup function to execute
 * @param {string} context - Context for logging
 */
async function safeCleanup(cleanupFn, context) {
  try {
    await cleanupFn();
    logInfo('Cleanup completed successfully', { context });
  } catch (cleanupError) {
    logError('Cleanup failed', {
      context,
      error: cleanupError.message,
      stack: cleanupError.stack,
    });
  }
}

module.exports = {
  processWithRetry,
  processWithTimeout,
  createUploadError,
  handleUploadError,
  withUploadErrorHandling,
  safeCleanup,
};