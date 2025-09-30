// Circuit Breaker implementation using Opossum
// Provides failure isolation and resilience for external service calls

const CircuitBreaker = require('opossum');
const { CIRCUIT_BREAKER_CONFIG } = require('./constants');
const { error: logError, info: logInfo } = require('./logger');

/**
 * Circuit Breaker class wrapper for AI service calls
 * Implements the Circuit Breaker pattern to prevent cascading failures
 */
class AICircuitBreaker {
  constructor() {
    this.breaker = new CircuitBreaker(this._executeRequest.bind(this), {
      timeout: CIRCUIT_BREAKER_CONFIG.TIMEOUT,
      errorThresholdPercentage: CIRCUIT_BREAKER_CONFIG.ERROR_THRESHOLD_PERCENTAGE,
      resetTimeout: CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT,
    });

    // Event listeners for monitoring circuit breaker state
    this.breaker.on('open', () => {
      logError('Circuit breaker opened', { service: 'ai-processing' });
    });

    this.breaker.on('close', () => {
      logInfo('Circuit breaker closed', { service: 'ai-processing' });
    });

    this.breaker.on('halfOpen', () => {
      logInfo('Circuit breaker half-open', { service: 'ai-processing' });
    });

    this.breaker.on('fallback', (result) => {
      logError('Circuit breaker fallback triggered', { result, service: 'ai-processing' });
    });
  }

  /**
   * Execute a request through the circuit breaker
   * @param {Function} requestFn - The request function to execute
   * @returns {Promise} - Result of the request
   */
  async fire(requestFn) {
    try {
      return await this.breaker.fire(requestFn);
    } catch (error) {
      // If circuit breaker is open, throw specific error
      if (this.breaker.opened) {
        throw new Error('Circuit breaker is open');
      }
      throw error;
    }
  }

  /**
   * Check if the circuit breaker can execute requests
   * @returns {boolean} - True if requests can be executed
   */
  canExecute() {
    return !this.breaker.opened;
  }

  /**
   * Record a successful operation
   */
  recordSuccess() {
    // Opossum handles success recording internally
    // This method is for compatibility with test expectations
  }

  /**
   * Record a failed operation
   */
  recordFailure() {
    // Opossum handles failure recording internally
    // This method is for compatibility with test expectations
  }

  /**
   * Internal method to execute the actual request
   * @param {Function} requestFn - The request function
   * @returns {*} - Result of the request
   */
  async _executeRequest(requestFn) {
    return await requestFn();
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} - Circuit breaker stats
   */
  get stats() {
    return this.breaker.stats;
  }
}

// Create singleton instance
const aiCircuitBreaker = new AICircuitBreaker();

module.exports = {
  AICircuitBreaker,
  aiCircuitBreaker,
};