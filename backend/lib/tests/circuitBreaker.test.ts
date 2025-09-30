/**
 * Unit tests for Circuit Breaker pattern implementation
 *
 * Tests circuit breaker functionality including:
 * - State transitions (closed, open, half-open)
 * - Failure threshold handling
 * - Recovery timeout behavior
 * - Retry logic with exponential backoff
 * - Manual reset functionality
 */

import { CircuitBreaker, createCircuitBreaker } from '../circuitBreaker';

// Mock the global logger
jest.mock('../logger', () => ({
  globalLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    circuitBreaker = new CircuitBreaker();
    mockLogger = require('../logger').globalLogger;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should accept custom configuration', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 10,
        recoveryTimeout: 30000,
        maxRetries: 5,
      });

      expect(customBreaker.getState()).toBe('closed');
    });
  });

  describe('execute', () => {
    it('should execute successful function in closed state', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should handle function failure and stay closed below threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Fail 5 times (default threshold)
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');
      }

      expect(circuitBreaker.getState()).toBe('open');
      expect(circuitBreaker.getFailureCount()).toBe(5);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit breaker opened due to 5 consecutive failures'
      );
    });

    it('should reject calls when circuit is open', async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');
      }

      // Now circuit should be open
      const successFn = jest.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(successFn)).rejects.toThrow(
        'Circuit breaker is open - service temporarily unavailable'
      );

      expect(successFn).not.toHaveBeenCalled();
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');
      }

      // Advance time past recovery timeout (default 60 seconds)
      jest.advanceTimersByTime(61000);

      const successFn = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
      expect(mockLogger.info).toHaveBeenCalledWith('Circuit breaker closed after successful half-open test');
    });

    it('should stay open if half-open test fails', async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');
      }

      // Advance time past recovery timeout
      jest.advanceTimersByTime(61000);

      // Fail the half-open test
      const failFn = jest.fn().mockRejectedValue(new Error('Still failing'));
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow('Still failing');

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should implement retry logic with exponential backoff', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('Success on third try');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('Success on third try');
      expect(mockFn).toHaveBeenCalledTimes(3);

      // Check that delays were applied (exponential backoff)
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying in 1000ms (attempt 2)');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying in 2000ms (attempt 3)');
    });

    it('should respect maximum retry attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker execution failed after all retries'
      );

      expect(mockFn).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should handle custom retry configuration', async () => {
      const customBreaker = new CircuitBreaker({ maxRetries: 1 });
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(customBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker execution failed after all retries'
      );

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      expect(circuitBreaker.getState()).toBe('closed');

      // Simulate opening
      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      for (let i = 0; i < 5; i++) {
        circuitBreaker.execute(mockFn).catch(() => {});
      }

      expect(circuitBreaker.getState()).toBe('open');
    });
  });

  describe('getFailureCount', () => {
    it('should return current failure count', () => {
      expect(circuitBreaker.getFailureCount()).toBe(0);

      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      circuitBreaker.execute(mockFn).catch(() => {});

      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
  });

  describe('reset', () => {
    it('should manually reset circuit breaker to closed state', () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      for (let i = 0; i < 5; i++) {
        circuitBreaker.execute(mockFn).catch(() => {});
      }

      expect(circuitBreaker.getState()).toBe('open');
      expect(circuitBreaker.getFailureCount()).toBe(5);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Circuit breaker manually reset to closed state');
    });
  });

  describe('createCircuitBreaker', () => {
    it('should create a new circuit breaker instance', () => {
      const breaker = createCircuitBreaker();

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe('closed');
    });

    it('should pass configuration to created instance', () => {
      const config = { failureThreshold: 10 };
      const breaker = createCircuitBreaker(config);

      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });
  });

  describe('edge cases', () => {
    it('should handle function that throws non-Error objects', async () => {
      const mockFn = jest.fn().mockRejectedValue('String error');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('String error');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should handle extremely short recovery timeout', async () => {
      const fastBreaker = new CircuitBreaker({ recoveryTimeout: 1 });

      // Open circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      for (let i = 0; i < 5; i++) {
        await fastBreaker.execute(mockFn).catch(() => {});
      }

      // Advance minimal time
      jest.advanceTimersByTime(2);

      const successFn = jest.fn().mockResolvedValue('success');
      await fastBreaker.execute(successFn);

      expect(fastBreaker.getState()).toBe('closed');
    });

    it('should handle zero failure threshold', async () => {
      const zeroThresholdBreaker = new CircuitBreaker({ failureThreshold: 0 });

      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      await expect(zeroThresholdBreaker.execute(mockFn)).rejects.toThrow('Test');

      // Should open immediately
      expect(zeroThresholdBreaker.getState()).toBe('open');
    });

    it('should handle synchronous function execution', async () => {
      const syncFn = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(circuitBreaker.execute(syncFn)).rejects.toThrow('Sync error');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should handle very long execution times', async () => {
      const slowFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'slow success';
      });

      const result = await circuitBreaker.execute(slowFn);

      expect(result).toBe('slow success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('logging', () => {
    it('should log state transitions', async () => {
      // Open circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('Test'));
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(mockFn).catch(() => {});
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit breaker opened due to 5 consecutive failures'
      );

      // Transition to half-open
      jest.advanceTimersByTime(61000);
      await circuitBreaker.execute(jest.fn().mockResolvedValue('success'));

      expect(mockLogger.info).toHaveBeenCalledWith('Circuit breaker closed after successful half-open test');
    });

    it('should log retry attempts', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First'))
        .mockRejectedValueOnce(new Error('Second'))
        .mockResolvedValue('Success');

      await circuitBreaker.execute(mockFn);

      expect(mockLogger.warn).toHaveBeenCalledWith('Circuit breaker execution attempt 1 failed: First');
      expect(mockLogger.warn).toHaveBeenCalledWith('Circuit breaker execution attempt 2 failed: Second');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying in 1000ms (attempt 2)');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying in 2000ms (attempt 3)');
    });
  });
});