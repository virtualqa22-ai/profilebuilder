// Centralized constants for AI Processing Service
// This file contains all configuration values, API endpoints, validation rules, and other constants

const API_ENDPOINTS = {
  AI_PROCESS: process.env.AI_API_URL || '/api/ai/process',
  HEALTH_CHECK: '/health',
  METRICS: '/metrics',
};

const VALIDATION_RULES = {
  MAX_TEXT_LENGTH: 10000,
  MAX_TOKENS: 1000,
  MIN_TOKENS: 1,
  VALID_TASKS: ['summarize', 'rewrite', 'analyze', 'suggest'],
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 10,
  },
};

const CIRCUIT_BREAKER_CONFIG = {
  TIMEOUT: 5000, // 5 seconds
  ERROR_THRESHOLD_PERCENTAGE: 50,
  RESET_TIMEOUT: 30000, // 30 seconds
};

const RETRY_CONFIG = {
  RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  RETRY_CONDITION: (error) => {
    return error.code === 'ECONNABORTED' || error.response?.status >= 500;
  },
};

const CACHE_CONFIG = {
  MAX_SIZE: 100,
  TTL: 3600000, // 1 hour
};

const SECURITY_CONFIG = {
  SENSITIVE_FIELDS: ['password', 'token', 'key', 'secret', 'ssn', 'credit_card'],
  PROMPT_INJECTION_PATTERNS: [
    'ignore previous instructions',
    'system prompt',
    'you are now',
    'forget your',
    'bypass',
    'override',
  ],
};

const LOGGING_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  FORMAT: 'json',
};

const ACTOR_MESSAGE_TYPES = [
  'PROCESS_AI_REQUEST',
  'VALIDATE_CONTENT',
  'GENERATE_SUGGESTIONS',
  'ANALYZE_RESUME',
];

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};

const MESSAGES = {
  ERRORS: {
    INVALID_TEXT: 'Invalid text input',
    MAX_TOKENS_EXCEEDED: 'maxTokens must be between 1 and 1000',
    TEXT_TOO_LONG: 'Text exceeds maximum length of 10000 characters',
    INVALID_TASK: 'Invalid task type',
    CIRCUIT_BREAKER_OPEN: 'Circuit breaker is open',
    AI_PROCESSING_FAILED: 'AI processing failed',
    ACTOR_PROCESSING_FAILED: 'Actor processing failed',
    TIMEOUT: 'Operation timed out',
  },
  SUCCESS: {
    AI_PROCESSING_COMPLETED: 'AI processing completed successfully',
    HEALTH_CHECK_OK: 'Service is healthy',
  },
};

module.exports = {
  API_ENDPOINTS,
  VALIDATION_RULES,
  CIRCUIT_BREAKER_CONFIG,
  RETRY_CONFIG,
  CACHE_CONFIG,
  SECURITY_CONFIG,
  LOGGING_CONFIG,
  ACTOR_MESSAGE_TYPES,
  ERROR_CODES,
  MESSAGES,
};