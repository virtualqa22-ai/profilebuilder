// Centralized constants for the rate limiting microservice
// This file contains all configuration defaults, error codes, messages, and other constants
// to promote DRY principles and easy maintenance.

// Server configuration defaults
const DEFAULT_PORT = 3000;

// Rate limiting configuration defaults
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 1000;

// Circuit breaker configuration defaults
const DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS = 5000; // 5 seconds
const DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;

// Logging configuration defaults
const DEFAULT_LOG_LEVEL = 'info';

// Redis configuration defaults
const DEFAULT_REDIS_HOSTS = ['localhost:6379'];
const REDIS_KEY_PREFIX = 'rate_limit:';
const REDIS_AOF_ENABLED = true;

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
};

// Error codes for standardized error handling
const ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  REDIS_CONNECTION_ERROR: 'REDIS_CONNECTION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// Error messages for consistent user-facing messages
const ERROR_MESSAGES = {
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ERROR_CODES.CIRCUIT_BREAKER_OPEN]: 'Service temporarily unavailable. Please try again later.',
  [ERROR_CODES.REDIS_CONNECTION_ERROR]: 'Database connection error.',
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid request parameters.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error.',
};

// Success messages
const SUCCESS_MESSAGES = {
  REQUEST_ALLOWED: 'Request allowed.',
  HEALTH_CHECK_OK: 'Service is healthy.',
};

// Metrics constants
const METRICS_PREFIX = 'rate_limiting_';
const METRICS_NAMES = {
  REQUESTS_TOTAL: `${METRICS_PREFIX}requests_total`,
  REQUESTS_ALLOWED: `${METRICS_PREFIX}requests_allowed_total`,
  REQUESTS_BLOCKED: `${METRICS_PREFIX}requests_blocked_total`,
  REQUEST_DURATION: `${METRICS_PREFIX}request_duration_seconds`,
  CIRCUIT_BREAKER_STATE: `${METRICS_PREFIX}circuit_breaker_state`,
  REDIS_CONNECTION_STATUS: `${METRICS_PREFIX}redis_connection_status`,
};

// Validation constants
const VALIDATION_RULES = {
  USER_ID_MIN_LENGTH: 1,
  USER_ID_MAX_LENGTH: 100,
  ENDPOINT_MIN_LENGTH: 1,
  ENDPOINT_MAX_LENGTH: 500,
};

// Circuit breaker states
const CIRCUIT_BREAKER_STATES = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
};

// Export all constants
module.exports = {
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS,
  DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REDIS_HOSTS,
  REDIS_KEY_PREFIX,
  REDIS_AOF_ENABLED,
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  METRICS_PREFIX,
  METRICS_NAMES,
  VALIDATION_RULES,
  CIRCUIT_BREAKER_STATES,
};