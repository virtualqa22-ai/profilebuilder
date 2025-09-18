/**
 * Centralized Logging Module
 *
 * Provides structured logging with correlation IDs for request tracing.
 * Uses Winston for logging with configurable transports and formats.
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

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

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

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
}

// Global logger instance
export const globalLogger = new Logger();

// Export winston logger for advanced usage
export { logger };