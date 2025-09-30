// Error handling utilities for Document Generation Service
// Provides standardized error objects and consistent error codes

const { ERROR_CODES, MESSAGES } = require('./constants');
const { error: logError } = require('./logger');

/**
 * Custom error class for document generation errors
 */
class DocumentGenerationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DocumentGenerationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Creates a standardized error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {DocumentGenerationError} Standardized error object
 */
function createError(code, message, details = {}) {
  return new DocumentGenerationError(code, message, details);
}

/**
 * Handles errors with logging and standardized response
 * @param {Error} error - Original error
 * @param {string} context - Error context
 * @param {Object} meta - Additional metadata for logging
 * @returns {DocumentGenerationError} Standardized error
 */
function handleError(error, context = '', meta = {}) {
  let code = ERROR_CODES.GENERATION_ERROR;
  let message = error.message || MESSAGES.ERRORS.GENERATION_ERROR;

  // Map common error types to specific codes
  if (error.code === 'ENOENT') {
    code = ERROR_CODES.FILE_ERROR;
    message = MESSAGES.ERRORS.TEMPLATE_NOT_FOUND;
  } else if (error.message && error.message.includes('validation')) {
    code = ERROR_CODES.VALIDATION_ERROR;
  } else if (error.message && error.message.includes('security')) {
    code = ERROR_CODES.SECURITY_ERROR;
  }

  // Log the error
  logError(`Error in ${context}: ${error.message}`, {
    ...meta,
    errorCode: code,
    stack: error.stack,
  });

  return createError(code, message, { originalError: error.message });
}

/**
 * Wraps async functions with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Error context
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context = '') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context, { args: args.length });
    }
  };
}

/**
 * Validates operation preconditions and throws errors if not met
 * @param {boolean} condition - Condition to check
 * @param {string} code - Error code if condition fails
 * @param {string} message - Error message if condition fails
 */
function assert(condition, code, message) {
  if (!condition) {
    throw createError(code, message);
  }
}

/**
 * Retries an operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {*} Operation result
 */
async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw handleError(lastError, 'retry operation', { maxRetries });
}

module.exports = {
  DocumentGenerationError,
  createError,
  handleError,
  withErrorHandling,
  assert,
  retryOperation,
};