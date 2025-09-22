/**
 * Centralized Logging Module
 *
 * Provides structured logging with correlation IDs for request tracing.
 * Uses Winston for logging with configurable transports and formats.
 * Supports request/response logging with timing and performance metrics.
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Request context storage for correlation IDs
const requestStorage = new (globalThis.AsyncLocalStorage || require('async_hooks').AsyncLocalStorage)();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define structured log format
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId: correlationId || 'unknown',
      ...meta,
    });
  }),
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: [${info.correlationId || 'unknown'}] ${info.message}`,
  ),
);

// Define transports
const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: structuredFormat,
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format: structuredFormat,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: structuredFormat,
  transports,
});

/**
 * Get logger instance for current request context
 */
export function getRequestLogger(): Logger {
  const store = requestStorage.getStore();
  if (store && store.correlationId) {
    return new Logger(store.correlationId);
  }
  return globalLogger;
}

/**
 * Logger class with correlation ID support
 */
export class Logger {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || uuidv4();
  }

  /**
   * Set correlation ID for this logger instance
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    logger.info(message, { correlationId: this.correlationId, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, meta?: any): void {
    logger.error(message, {
      correlationId: this.correlationId,
      error: error?.message,
      stack: error?.stack,
      ...meta
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    logger.warn(message, { correlationId: this.correlationId, ...meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    logger.debug(message, { correlationId: this.correlationId, ...meta });
  }

  /**
   * Log HTTP request
   */
  http(message: string, meta?: any): void {
    logger.http(message, { correlationId: this.correlationId, ...meta });
  }

  /**
   * Log request start with timing
   */
  logRequestStart(method: string, url: string, meta?: any): void {
    this.http(`Request started: ${method} ${url}`, {
      event: 'request_start',
      method,
      url,
      ...meta
    });
  }

  /**
   * Log request completion with timing
   */
  logRequestEnd(method: string, url: string, statusCode: number, duration: number, meta?: any): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    this[level](`Request completed: ${method} ${url} - ${statusCode} (${duration}ms)`, {
      event: 'request_end',
      method,
      url,
      statusCode,
      duration,
      ...meta
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation: string, collection: string, duration?: number, meta?: any): void {
    this.debug(`Database operation: ${operation} on ${collection}`, {
      event: 'db_operation',
      operation,
      collection,
      duration,
      ...meta
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, meta?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      event: 'performance',
      operation,
      duration,
      ...meta
    });
  }
}

// Global logger instance
export const globalLogger = new Logger();

// Export winston logger for advanced usage
export { logger };