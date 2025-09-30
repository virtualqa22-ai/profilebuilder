/**
 * Unit tests for Logger utilities
 *
 * Tests logging functionality including:
 * - Logger class with correlation IDs
 * - Request logging with timing
 * - Database operation logging
 * - Performance logging
 * - Global logger instance
 */

import { Logger, globalLogger, getRequestLogger } from '../logger';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  }),
  format: {
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    combine: jest.fn(),
    colorize: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  addColors: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-123'),
}));

// Mock async_hooks
jest.mock('async_hooks', () => ({
  AsyncLocalStorage: jest.fn().mockImplementation(() => ({
    getStore: jest.fn(),
  })),
}));

describe('Logger', () => {
  let mockLogger: any;
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked winston logger
    const { createLogger } = require('winston');
    mockLogger = createLogger.mock.results[0]?.value || {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      http: jest.fn(),
    };

    logger = new Logger('test-correlation-id');
  });

  describe('Logger constructor', () => {
    it('should create logger with provided correlation ID', () => {
      const testId = 'custom-id';
      const testLogger = new Logger(testId);

      expect(testLogger.getCorrelationId()).toBe(testId);
    });

    it('should generate UUID when no correlation ID provided', () => {
      const testLogger = new Logger();

      expect(testLogger.getCorrelationId()).toBe('mock-uuid-123');
    });
  });

  describe('setCorrelationId', () => {
    it('should update correlation ID', () => {
      const newId = 'new-correlation-id';
      logger.setCorrelationId(newId);

      expect(logger.getCorrelationId()).toBe(newId);
    });
  });

  describe('info', () => {
    it('should log info message with correlation ID', () => {
      const message = 'Test info message';
      const meta = { key: 'value' };

      logger.info(message, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        ...meta,
      });
    });

    it('should log info message without meta', () => {
      const message = 'Test info message';

      logger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
      });
    });
  });

  describe('error', () => {
    it('should log error message with Error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      const meta = { additional: 'data' };

      logger.error(message, error, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        error: 'Test error',
        stack: error.stack,
        ...meta,
      });
    });

    it('should log error message without Error object', () => {
      const message = 'Test error message';
      const meta = { additional: 'data' };

      logger.error(message, undefined, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        error: undefined,
        stack: undefined,
        ...meta,
      });
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const message = 'Test warning message';
      const meta = { level: 'warning' };

      logger.warn(message, meta);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        ...meta,
      });
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      const message = 'Test debug message';
      const meta = { debug: true };

      logger.debug(message, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        ...meta,
      });
    });
  });

  describe('http', () => {
    it('should log HTTP message', () => {
      const message = 'HTTP request';
      const meta = { method: 'GET', url: '/test' };

      logger.http(message, meta);

      expect(mockLogger.http).toHaveBeenCalledWith(message, {
        correlationId: 'test-correlation-id',
        ...meta,
      });
    });
  });

  describe('logRequestStart', () => {
    it('should log request start with timing', () => {
      const method = 'POST';
      const url = '/api/test';
      const meta = { userId: '123' };

      logger.logRequestStart(method, url, meta);

      expect(mockLogger.http).toHaveBeenCalledWith(
        'Request started: POST /api/test',
        {
          correlationId: 'test-correlation-id',
          event: 'request_start',
          method,
          url,
          ...meta,
        }
      );
    });
  });

  describe('logRequestEnd', () => {
    it('should log successful request end', () => {
      const method = 'GET';
      const url = '/api/data';
      const statusCode = 200;
      const duration = 150;
      const meta = { size: '2KB' };

      logger.logRequestEnd(method, url, statusCode, duration, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed: GET /api/data - 200 (150ms)',
        {
          correlationId: 'test-correlation-id',
          event: 'request_end',
          method,
          url,
          statusCode,
          duration,
          ...meta,
        }
      );
    });

    it('should log error request end for 4xx status', () => {
      const method = 'POST';
      const url = '/api/create';
      const statusCode = 400;
      const duration = 200;

      logger.logRequestEnd(method, url, statusCode, duration);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request completed: POST /api/create - 400 (200ms)',
        {
          correlationId: 'test-correlation-id',
          event: 'request_end',
          method,
          url,
          statusCode,
          duration,
        }
      );
    });

    it('should log warning request end for 3xx status', () => {
      const method = 'GET';
      const url = '/api/redirect';
      const statusCode = 302;
      const duration = 50;

      logger.logRequestEnd(method, url, statusCode, duration);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request completed: GET /api/redirect - 302 (50ms)',
        {
          correlationId: 'test-correlation-id',
          event: 'request_end',
          method,
          url,
          statusCode,
          duration,
        }
      );
    });
  });

  describe('logDatabaseOperation', () => {
    it('should log database operation with duration', () => {
      const operation = 'find';
      const collection = 'users';
      const duration = 25;
      const meta = { count: 10 };

      logger.logDatabaseOperation(operation, collection, duration, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database operation: find on users',
        {
          correlationId: 'test-correlation-id',
          event: 'db_operation',
          operation,
          collection,
          duration,
          ...meta,
        }
      );
    });

    it('should log database operation without duration', () => {
      const operation = 'insert';
      const collection = 'logs';

      logger.logDatabaseOperation(operation, collection);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database operation: insert on logs',
        {
          correlationId: 'test-correlation-id',
          event: 'db_operation',
          operation,
          collection,
          duration: undefined,
        }
      );
    });
  });

  describe('logPerformance', () => {
    it('should log performance metric', () => {
      const operation = 'ai-rewrite';
      const duration = 1250;
      const meta = { model: 'gpt-3.5-turbo' };

      logger.logPerformance(operation, duration, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance: ai-rewrite took 1250ms',
        {
          correlationId: 'test-correlation-id',
          event: 'performance',
          operation,
          duration,
          ...meta,
        }
      );
    });
  });

  describe('globalLogger', () => {
    it('should be an instance of Logger', () => {
      expect(globalLogger).toBeInstanceOf(Logger);
    });

    it('should have a correlation ID', () => {
      expect(typeof globalLogger.getCorrelationId()).toBe('string');
      expect(globalLogger.getCorrelationId().length).toBeGreaterThan(0);
    });
  });

  describe('getRequestLogger', () => {
    it('should return logger from request context when available', () => {
      const mockStore = { correlationId: 'request-id-123' };
      const mockAsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
      const mockInstance = mockAsyncLocalStorage.mock.results[0]?.value;
      mockInstance.getStore.mockReturnValue(mockStore);

      const requestLogger = getRequestLogger();

      expect(requestLogger).toBeInstanceOf(Logger);
      expect(requestLogger.getCorrelationId()).toBe('request-id-123');
    });

    it('should return global logger when no request context', () => {
      const mockAsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
      const mockInstance = mockAsyncLocalStorage.mock.results[0]?.value;
      mockInstance.getStore.mockReturnValue(null);

      const requestLogger = getRequestLogger();

      expect(requestLogger).toBe(globalLogger);
    });
  });

  describe('winston logger configuration', () => {
    it('should create logger with proper configuration', () => {
      const { createLogger, format, transports } = require('winston');

      expect(createLogger).toHaveBeenCalledWith({
        level: expect.any(String),
        levels: expect.any(Object),
        format: expect.any(Object),
        transports: expect.any(Array),
      });
    });

    it('should configure transports', () => {
      const { transports } = require('winston');

      expect(transports.Console).toHaveBeenCalled();
      expect(transports.File).toHaveBeenCalledTimes(2); // error.log and all.log
    });
  });

  describe('edge cases', () => {
    it('should handle empty correlation ID', () => {
      const emptyLogger = new Logger('');

      expect(emptyLogger.getCorrelationId()).toBe('');
    });

    it('should handle null meta in logging methods', () => {
      logger.info('test', null as any);
      logger.error('test', undefined, null as any);
      logger.warn('test', null as any);

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle undefined meta in logging methods', () => {
      logger.debug('test', undefined);
      logger.http('test', undefined);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.http).toHaveBeenCalled();
    });
  });
});