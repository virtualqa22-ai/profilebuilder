// Logging utility using Winston for centralized logging
// Provides structured logging with correlation IDs for request tracing

const winston = require('winston');
const { LOGGING_CONFIG } = require('./constants');

// Create winston logger instance with JSON format for structured logging
const logger = winston.createLogger({
  level: LOGGING_CONFIG.LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'document-generation-service' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Enhanced logging function that adds correlation ID and context
 * @param {string} level - Log level (info, error, warn, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata including correlationId
 */
function logWithContext(level, message, meta = {}) {
  const logData = {
    ...meta,
    timestamp: new Date().toISOString(),
  };

  logger.log(level, message, logData);
}

/**
 * Info level logging
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function info(message, meta = {}) {
  logWithContext('info', message, meta);
}

/**
 * Error level logging
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function error(message, meta = {}) {
  logWithContext('error', message, meta);
}

/**
 * Warning level logging
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function warn(message, meta = {}) {
  logWithContext('warn', message, meta);
}

/**
 * Debug level logging
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function debug(message, meta = {}) {
  logWithContext('debug', message, meta);
}

module.exports = {
  logger,
  info,
  error,
  warn,
  debug,
};