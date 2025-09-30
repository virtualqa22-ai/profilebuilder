// Test for logger utility
const logger = require('../src/utils/logger');

describe('Logger Utility', () => {
  test('should have required methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.addCorrelationId).toBe('function');
  });

  test('should have default meta with service name', () => {
    expect(logger.defaultMeta).toBeDefined();
    expect(logger.defaultMeta.service).toBe('resume-management-service');
  });

  test('should have levels defined', () => {
    expect(logger.levels).toBeDefined();
    expect(logger.levels.info).toBe(2);
    expect(logger.levels.error).toBe(0);
    expect(logger.levels.warn).toBe(1);
    expect(logger.levels.debug).toBe(3);
  });

  test('should add correlation ID and return child logger', () => {
    const correlationId = 'test-correlation-id-123';
    const childLogger = logger.addCorrelationId(correlationId);

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
    expect(typeof childLogger.error).toBe('function');
    expect(typeof childLogger.warn).toBe('function');
    expect(typeof childLogger.debug).toBe('function');
  });

  test('should log messages without throwing errors', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  test('should log with different log levels', () => {
    // Test that all logging methods are callable
    expect(() => logger.info('Info level')).not.toThrow();
    expect(() => logger.error('Error level')).not.toThrow();
    expect(() => logger.warn('Warn level')).not.toThrow();
    expect(() => logger.debug('Debug level')).not.toThrow();
  });

  test('should support structured logging', () => {
    // Test logging with objects
    const testObject = { userId: '123', action: 'test' };
    expect(() => logger.info('Structured log', testObject)).not.toThrow();
  });

  test('should handle correlation ID in child logger', () => {
    const correlationId = 'correlation-456';
    const childLogger = logger.addCorrelationId(correlationId);

    expect(() => {
      childLogger.info('Child logger info');
      childLogger.error('Child logger error');
    }).not.toThrow();
  });
});