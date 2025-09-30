// Centralized constants for Document Generation Service
// This file contains all configuration values, API endpoints, validation rules, and other constants

const API_ENDPOINTS = {
  GENERATE_DOCUMENT: process.env.DOCUMENT_API_URL || '/api/document/generate',
  HEALTH_CHECK: '/health',
  METRICS: '/metrics',
};

const VALIDATION_RULES = {
  MAX_TEXT_LENGTH: 10000,
  MAX_FILE_SIZE: 10485760, // 10MB
  MIN_FILE_SIZE: 1,
  VALID_FORMATS: ['pdf', 'docx', 'txt'],
  MAX_LINE_LENGTH: 80,
  INDENT_SIZE: 2,
  DATE_FORMAT: 'MM/DD/YYYY',
  FONT_SIZE_MIN: 8,
  FONT_SIZE_MAX: 72,
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 10,
  },
};

const RETRY_CONFIG = {
  RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  RETRY_CONDITION: (error) => {
    return error.code === 'ECONNABORTED' || error.response?.status >= 500;
  },
};

const TEMPLATE_CONFIG = {
  MAX_TEMPLATE_SIZE: 1048576, // 1MB
  SUPPORTED_EXTENSIONS: ['.json', '.txt'],
  PLACEHOLDER_PATTERN: /\{\{(\w+)\}\}/g,
};

const PDF_CONFIG = {
  PAGE_HEIGHT: 800,
  PAGE_WIDTH: 600,
  MARGIN: 50,
  LINE_HEIGHT: 20,
  FONT_SIZE_DEFAULT: 12,
};

const SECURITY_CONFIG = {
  SENSITIVE_FIELDS: ['password', 'token', 'key', 'secret', 'ssn', 'credit_card'],
  ALLOWED_PATH_PATTERN: /^[\w\-\.\/]+$/,
  FORBIDDEN_PATHS: ['..', '../', '/etc', '/root', '/home'],
};

const LOGGING_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  FORMAT: 'json',
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};

const MESSAGES = {
  ERRORS: {
    MISSING_REQUIRED_FIELDS: 'Missing required fields: name and email',
    INVALID_EMAIL: 'Invalid email format',
    EXPERIENCE_MISSING_FIELDS: 'Experience entry missing company or position',
    CONTENT_TOO_LARGE: 'Document content exceeds maximum size',
    TEMPLATE_NOT_FOUND: 'Template loading failed',
    PDF_GENERATION_FAILED: 'PDF generation failed',
    FILE_SAVE_FAILED: 'File save failed',
    INVALID_PATH: 'Invalid file path',
    FONT_SIZE_INVALID: 'Font size must be between 8 and 72',
    TEMPLATE_INVALID: 'Template structure is invalid',
  },
  SUCCESS: {
    DOCUMENT_GENERATED: 'Document generated successfully',
    FILE_SAVED: 'Document saved successfully',
    HEALTH_CHECK_OK: 'Service is healthy',
  },
};

module.exports = {
  API_ENDPOINTS,
  VALIDATION_RULES,
  RETRY_CONFIG,
  TEMPLATE_CONFIG,
  PDF_CONFIG,
  SECURITY_CONFIG,
  LOGGING_CONFIG,
  ERROR_CODES,
  MESSAGES,
};