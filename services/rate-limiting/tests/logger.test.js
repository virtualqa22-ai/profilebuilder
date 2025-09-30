// Unit tests for logger utility

const { setLogLevel, debug, info, warn, error, logRequestStart, logRequestComplete, logRateLimitCheck } = require('../src/utils/logger');

describe('Logger', () => {
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('setLogLevel', () => {
    test('should set valid log level', () => {
      setLogLevel('debug');
      // Test by logging at different levels
      debug('test debug');
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockClear();
      setLogLevel('error');
      debug('test debug filtered');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should handle invalid log level and use default', () => {
      setLogLevel('invalid');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid log level: invalid. Using default: info');
    });
  });

  describe('Log level functions', () => {
    beforeEach(() => {
      setLogLevel('debug'); // Ensure all levels are logged
    });

    test('debug should log debug level message', () => {
      debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"debug"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Debug message"')
      );
    });

    test('info should log info level message', () => {
      info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
    });

    test('warn should log warn level message', () => {
      warn('Warning message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
    });

    test('error should log error level message', () => {
      error('Error message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
    });
  });

  describe('Log filtering', () => {
    test('should filter logs below current level', () => {
      consoleLogSpy.mockClear(); // Clear previous calls
      setLogLevel('warn'); // Only warn and error should be logged

      debug('Debug - should be filtered');
      info('Info - should be filtered');
      warn('Warn - should be logged');
      error('Error - should be logged');

      // Should have been called for warn and error only
      const calls = consoleLogSpy.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).toContain('"level":"warn"');
      expect(calls[1][0]).toContain('"level":"error"');
    });
  });

  describe('Metadata and correlation ID', () => {
    beforeEach(() => {
      setLogLevel('debug');
    });

    test('should include metadata in log entry', () => {
      const meta = { userId: '123', action: 'login' };
      info('Test with metadata', meta);
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('"userId":"123"');
      expect(loggedOutput).toContain('"action":"login"');
    });

    test('should include correlation ID in log entry', () => {
      const correlationId = 'corr-123';
      info('Test with correlation ID', {}, correlationId);
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('"correlationId":"corr-123"');
    });

    test('should include service name in all log entries', () => {
      info('Test service name');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('"service":"rate-limiting-service"');
    });
  });

  describe('Specialized logging functions', () => {
    beforeEach(() => {
      setLogLevel('debug');
    });

    test('logRequestStart should log request start with correct format', () => {
      logRequestStart('GET', '/api/test', 'corr-123');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('Request started: GET /api/test');
      expect(loggedOutput).toContain('"method":"GET"');
      expect(loggedOutput).toContain('"url":"/api/test"');
      expect(loggedOutput).toContain('"correlationId":"corr-123"');
    });

    test('logRequestComplete should log request completion with all details', () => {
      logRequestComplete('POST', '/api/users', 201, 150, 'corr-456');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('Request completed: POST /api/users');
      expect(loggedOutput).toContain('"statusCode":201');
      expect(loggedOutput).toContain('"duration":150');
    });

    test('logRateLimitCheck should log rate limit decision', () => {
      logRateLimitCheck('user-123', '/api/protected', true, 'corr-789');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('Rate limit check: allowed');
      expect(loggedOutput).toContain('"userId":"user-123"');
      expect(loggedOutput).toContain('"endpoint":"/api/protected"');
      expect(loggedOutput).toContain('"allowed":true');
    });

    test('logRateLimitCheck should log blocked requests', () => {
      logRateLimitCheck('user-456', '/api/blocked', false, 'corr-999');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('Rate limit check: blocked');
      expect(loggedOutput).toContain('"allowed":false');
    });
  });

  describe('JSON format validation', () => {
    test('should produce valid JSON output', () => {
      info('Test JSON format');
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(loggedOutput)).not.toThrow();
    });

    test('should include timestamp in ISO format', () => {
      const before = new Date().toISOString();
      info('Test timestamp');
      const after = new Date().toISOString();

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(parsed.timestamp >= before || parsed.timestamp <= after).toBe(true);
    });
  });
});