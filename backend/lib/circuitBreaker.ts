/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides resilience against cascading failures by tracking failure rates
 * and temporarily stopping calls to failing services. Includes automatic
 * retry with exponential backoff for improved fault tolerance.
 *
 * States:
 * - Closed: Normal operation, calls allowed
 * - Open: Failure threshold exceeded, calls blocked
 * - Half-Open: Testing recovery, limited calls allowed
 */

import { globalLogger } from './logger';

/**
 * Circuit breaker configuration interface
 */
interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery */
  recoveryTimeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in ms for exponential backoff */
  baseDelay: number;
  /** Maximum delay in ms for exponential backoff */
  maxDelay: number;
}

/**
 * Default circuit breaker configuration
 */
const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

/**
 * Circuit Breaker class for fault tolerance
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private config: CircuitBreakerConfig;

  /**
   * Creates a new circuit breaker instance
   * @param config Optional configuration overrides
   */
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Executes a function with circuit breaker protection and retry logic
   * @param fn The async function to execute
   * @returns Promise resolving to the function result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        // Transition to half-open for testing
        this.state = 'half-open';
        globalLogger.info('Circuit breaker transitioning to half-open state');
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    // Attempt execution with retries
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await fn();

        // Success - reset failures and close circuit
        this.onSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        globalLogger.warn(`Circuit breaker execution attempt ${attempt} failed:`, error);

        // If not the last attempt, wait with exponential backoff
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(
            this.config.baseDelay * Math.pow(2, attempt - 1),
            this.config.maxDelay
          );
          globalLogger.info(`Retrying in ${delay}ms (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - record failure and throw
    this.onFailure();
    throw lastError || new Error('Circuit breaker execution failed after all retries');
  }

  /**
   * Handles successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      globalLogger.info('Circuit breaker closed after successful half-open test');
    }
  }

  /**
   * Handles failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      globalLogger.warn(`Circuit breaker opened due to ${this.failures} consecutive failures`);
    }
  }

  /**
   * Gets the current state of the circuit breaker
   * @returns Current state ('closed', 'open', or 'half-open')
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Gets current failure count
   * @returns Number of consecutive failures
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Manually resets the circuit breaker to closed state
   */
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    globalLogger.info('Circuit breaker manually reset to closed state');
  }
}

/**
 * Factory function to create circuit breaker instances
 * @param config Optional configuration
 * @returns New CircuitBreaker instance
 */
export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> = {}): CircuitBreaker {
  return new CircuitBreaker(config);
}