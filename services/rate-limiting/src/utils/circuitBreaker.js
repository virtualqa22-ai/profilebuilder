// Circuit breaker utility for fail-closed behavior in the rate limiting microservice
// Implements circuit breaker pattern to prevent cascading failures when Redis is unavailable
// States: CLOSED (normal operation), OPEN (fail all requests), HALF_OPEN (test requests)

const { CIRCUIT_BREAKER_STATES, DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS, DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD } = require('../constants');
const { updateCircuitBreakerState } = require('./metrics');

// Circuit breaker state
let state = CIRCUIT_BREAKER_STATES.CLOSED;
let failureCount = 0;
let lastFailureTime = null;
let successCount = 0;

// Configuration
let timeoutMs = process.env.CIRCUIT_BREAKER_TIMEOUT_MS || DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS;
let failureThreshold = process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD;

/**
 * Get current circuit breaker state
 * @returns {string} - Current state
 */
function getState() {
  return state;
}

/**
 * Check if circuit breaker allows requests
 * @returns {boolean} - True if requests are allowed
 */
function canExecute() {
  switch (state) {
    case CIRCUIT_BREAKER_STATES.CLOSED:
      return true;
    case CIRCUIT_BREAKER_STATES.OPEN:
      // Check if timeout has passed to transition to half-open
      if (lastFailureTime && (Date.now() - lastFailureTime) > timeoutMs) {
        transitionToHalfOpen();
        return true; // Allow one test request
      }
      return false;
    case CIRCUIT_BREAKER_STATES.HALF_OPEN:
      return true; // Allow test requests
    default:
      return false;
  }
}

/**
 * Record a successful operation
 */
function recordSuccess() {
  failureCount = 0; // Reset failure count on success

  if (state === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
    successCount++;
    // After a few successes in half-open, close the circuit
    if (successCount >= 3) { // Arbitrary threshold for half-open success
      transitionToClosed();
    }
  }
}

/**
 * Record a failed operation
 */
function recordFailure() {
  failureCount++;
  lastFailureTime = Date.now();

  if (state === CIRCUIT_BREAKER_STATES.CLOSED && failureCount >= failureThreshold) {
    transitionToOpen();
  } else if (state === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
    // If failure in half-open, go back to open
    transitionToOpen();
  }
}

/**
 * Transition to CLOSED state
 */
function transitionToClosed() {
  state = CIRCUIT_BREAKER_STATES.CLOSED;
  failureCount = 0;
  successCount = 0;
  updateCircuitBreakerState(state);
}

/**
 * Transition to OPEN state
 */
function transitionToOpen() {
  state = CIRCUIT_BREAKER_STATES.OPEN;
  successCount = 0;
  updateCircuitBreakerState(state);
}

/**
 * Transition to HALF_OPEN state
 */
function transitionToHalfOpen() {
  state = CIRCUIT_BREAKER_STATES.HALF_OPEN;
  successCount = 0;
  updateCircuitBreakerState(state);
}

/**
 * Force circuit breaker to open (for testing or manual intervention)
 */
function forceOpen() {
  transitionToOpen();
}

/**
 * Force circuit breaker to close (for testing or manual intervention)
 */
function forceClose() {
  transitionToClosed();
}

/**
 * Get circuit breaker statistics
 * @returns {object} - Statistics object
 */
function getStats() {
  return {
    state,
    failureCount,
    successCount,
    lastFailureTime,
    timeoutMs,
    failureThreshold,
  };
}

/**
 * Update configuration (for dynamic reconfiguration)
 * @param {object} config - New configuration
 */
function updateConfig(config) {
  if (config.timeoutMs) {
    timeoutMs = config.timeoutMs;
  }
  if (config.failureThreshold) {
    failureThreshold = config.failureThreshold;
  }
}

// Initialize metrics
updateCircuitBreakerState(state);

// Export circuit breaker functions
module.exports = {
  getState,
  canExecute,
  recordSuccess,
  recordFailure,
  forceOpen,
  forceClose,
  getStats,
  updateConfig,
};