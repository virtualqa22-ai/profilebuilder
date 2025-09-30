// Unit tests for circuit breaker utility

const { getState, canExecute, recordSuccess, recordFailure, forceOpen, forceClose, getStats } = require('../src/utils/circuitBreaker');

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset circuit breaker state before each test
    forceClose();
  });

  test('should start in closed state', () => {
    expect(getState()).toBe('closed');
    expect(canExecute()).toBe(true);
  });

  test('should transition to open after failures', () => {
    // Record multiple failures
    for (let i = 0; i < 5; i++) {
      recordFailure();
    }

    expect(getState()).toBe('open');
    expect(canExecute()).toBe(false);
  });

  test('should record success and stay closed', () => {
    recordSuccess();
    expect(getState()).toBe('closed');
    expect(canExecute()).toBe(true);
  });

  test('should force open and close', () => {
    forceOpen();
    expect(getState()).toBe('open');
    expect(canExecute()).toBe(false);

    forceClose();
    expect(getState()).toBe('closed');
    expect(canExecute()).toBe(true);
  });

  test('should return stats', () => {
    const stats = getStats();
    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failureCount');
    expect(stats).toHaveProperty('successCount');
    expect(stats).toHaveProperty('timeoutMs');
    expect(stats).toHaveProperty('failureThreshold');
  });
});

// Additional tests for comprehensive coverage
describe('Circuit Breaker - Advanced Scenarios', () => {
  beforeEach(() => {
    forceClose();
  });

  test('should transition from open to half-open after timeout', () => {
    // Force open state
    forceOpen();
    expect(getState()).toBe('open');

    // Mock Date.now to simulate timeout
    const originalNow = Date.now;
    const mockNow = jest.fn(() => originalNow() + 6000); // 6 seconds later
    global.Date.now = mockNow;

    expect(canExecute()).toBe(true); // Should allow test request
    expect(getState()).toBe('half_open');

    // Restore Date.now
    global.Date.now = originalNow;
  });

  test('should not transition from open to half-open before timeout', () => {
    forceOpen();
    expect(getState()).toBe('open');

    // Mock Date.now to simulate time before timeout
    const originalNow = Date.now;
    const mockNow = jest.fn(() => originalNow() + 1000); // 1 second later
    global.Date.now = mockNow;

    expect(canExecute()).toBe(false); // Should not allow requests
    expect(getState()).toBe('open');

    global.Date.now = originalNow;
  });

  test('should transition from half-open to closed after successes', () => {
    // Force open and then trigger timeout to get to half-open
    forceOpen();
    const originalNow = Date.now;
    const mockNow = jest.fn(() => originalNow() + 6000);
    global.Date.now = mockNow;

    canExecute(); // This should transition to half-open
    expect(getState()).toBe('half_open');

    // Record 3 successes
    recordSuccess();
    expect(getState()).toBe('half_open');
    recordSuccess();
    expect(getState()).toBe('half_open');
    recordSuccess();
    expect(getState()).toBe('closed');

    global.Date.now = originalNow;
  });

  test('should transition from half-open to open on failure', () => {
    // Force open and then trigger timeout to get to half-open
    forceOpen();
    const originalNow = Date.now;
    const mockNow = jest.fn(() => originalNow() + 6000);
    global.Date.now = mockNow;

    canExecute(); // This should transition to half-open
    expect(getState()).toBe('half_open');

    recordFailure();
    expect(getState()).toBe('open');

    global.Date.now = originalNow;
  });

  test('should reset failure count on success in closed state', () => {
    // Record some failures but not enough to open
    recordFailure();
    recordFailure();
    expect(getState()).toBe('closed');

    recordSuccess();
    const stats = getStats();
    expect(stats.failureCount).toBe(0);
  });

  test('should handle updateConfig', () => {
    const { updateConfig } = require('../src/utils/circuitBreaker');

    updateConfig({ timeoutMs: 10000, failureThreshold: 10 });

    const stats = getStats();
    expect(stats.timeoutMs).toBe(10000);
    expect(stats.failureThreshold).toBe(10);
  });

  test('should track lastFailureTime correctly', () => {
    const before = Date.now();
    recordFailure();
    const after = Date.now();

    const stats = getStats();
    expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
    expect(stats.lastFailureTime).toBeLessThanOrEqual(after);
  });

  test('should handle multiple rapid failures', () => {
    for (let i = 0; i < 10; i++) {
      recordFailure();
    }

    expect(getState()).toBe('open');
    const stats = getStats();
    expect(stats.failureCount).toBe(10);
  });
});