// Comprehensive logging utility for the rate limiting microservice
// Provides structured JSON logging with correlation IDs for request tracing
// Supports different log levels and configurable output

const { DEFAULT_LOG_LEVEL } = require('../constants');

// Log levels in order of severity (higher number = more severe)
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level, defaults to environment variable or constant
let currentLogLevel = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;

/**
 * Set the current log level
 * @param {string} level - The log level to set (debug, info, warn, error)
 */
function setLogLevel(level) {
  if (LOG_LEVELS.hasOwnProperty(level)) {
    currentLogLevel = level;
  } else {
    console.warn(`Invalid log level: ${level}. Using default: ${DEFAULT_LOG_LEVEL}`);
    currentLogLevel = DEFAULT_LOG_LEVEL;
  }
}

/**
 * Check if a log level should be output based on current level
 * @param {string} level - The level to check
 * @returns {boolean} - Whether to log this level
 */
function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

/**
 * Format log entry as structured JSON
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 * @returns {string} - JSON formatted log entry
 */
function formatLogEntry(level, message, meta = {}, correlationId = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'rate-limiting-service',
    ...meta,
  };

  if (correlationId) {
    logEntry.correlationId = correlationId;
  }

  return JSON.stringify(logEntry);
}

/**
 * Core logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 */
function log(level, message, meta = {}, correlationId = null) {
  if (!shouldLog(level)) {
    return;
  }

  const formattedEntry = formatLogEntry(level, message, meta, correlationId);
  console.log(formattedEntry);
}

/**
 * Log debug level message
 * @param {string} message - Debug message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 */
function debug(message, meta = {}, correlationId = null) {
  log('debug', message, meta, correlationId);
}

/**
 * Log info level message
 * @param {string} message - Info message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 */
function info(message, meta = {}, correlationId = null) {
  log('info', message, meta, correlationId);
}

/**
 * Log warning level message
 * @param {string} message - Warning message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 */
function warn(message, meta = {}, correlationId = null) {
  log('warn', message, meta, correlationId);
}

/**
 * Log error level message
 * @param {string} message - Error message
 * @param {object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 */
function error(message, meta = {}, correlationId = null) {
  log('error', message, meta, correlationId);
}

/**
 * Log request start
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {string} correlationId - Request correlation ID
 */
function logRequestStart(method, url, correlationId) {
  info(`Request started: ${method} ${url}`, { method, url }, correlationId);
}

/**
 * Log request completion
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in milliseconds
 * @param {string} correlationId - Request correlation ID
 */
function logRequestComplete(method, url, statusCode, duration, correlationId) {
  info(`Request completed: ${method} ${url}`, {
    method,
    url,
    statusCode,
    duration,
  }, correlationId);
}

/**
 * Log rate limit check
 * @param {string} userId - User ID
 * @param {string} endpoint - Endpoint
 * @param {boolean} allowed - Whether request was allowed
 * @param {string} correlationId - Request correlation ID
 */
function logRateLimitCheck(userId, endpoint, allowed, correlationId) {
  info(`Rate limit check: ${allowed ? 'allowed' : 'blocked'}`, {
    userId,
    endpoint,
    allowed,
  }, correlationId);
}

// Export logging functions
module.exports = {
  setLogLevel,
  debug,
  info,
  warn,
  error,
  logRequestStart,
  logRequestComplete,
  logRateLimitCheck,
};