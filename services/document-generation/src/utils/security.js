// Security utilities for Document Generation Service
// Provides input sanitization, path validation, and security checks

const { SECURITY_CONFIG } = require('./constants');
const { validatePath } = require('./validation');
const { createError, ERROR_CODES } = require('./error-handling');

/**
 * Sanitizes file paths to prevent directory traversal attacks
 * @param {string} path - File path to sanitize
 * @returns {string} Sanitized path
 */
function sanitizePath(path) {
  if (!path) return '';

  // Remove dangerous characters and patterns
  let sanitized = path
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/\//g, '/') // Remove double slashes
    .replace(/^\//, '') // Remove leading slash
    .trim();

  // Validate the sanitized path
  const errors = validatePath(sanitized);
  if (errors.length > 0) {
    throw createError(ERROR_CODES.SECURITY_ERROR, 'Invalid file path', { path, errors });
  }

  return sanitized;
}

/**
 * Sanitizes input data by removing potentially dangerous content
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeInput(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (SECURITY_CONFIG.SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'string') {
      // Basic string sanitization - remove potentially dangerous characters
      sanitized[key] = value.replace(/[<>\"'&]/g, '');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates file operations for security
 * @param {string} operation - Operation type (read, write, delete)
 * @param {string} path - File path
 * @param {Object} options - Additional options
 */
function validateFileOperation(operation, path, options = {}) {
  // Sanitize and validate path
  const sanitizedPath = sanitizePath(path);

  // Check file size limits if provided
  if (options.size && options.size > 10485760) { // 10MB limit
    throw createError(ERROR_CODES.SECURITY_ERROR, 'File size exceeds limit');
  }

  // Check for forbidden file extensions
  const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
  const extension = sanitizedPath.toLowerCase().substring(sanitizedPath.lastIndexOf('.'));
  if (forbiddenExtensions.includes(extension)) {
    throw createError(ERROR_CODES.SECURITY_ERROR, 'Forbidden file type');
  }

  return sanitizedPath;
}

/**
 * Checks if a request rate is within acceptable limits
 * @param {string} identifier - Request identifier (IP, user ID, etc.)
 * @param {number} limit - Rate limit
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if within limit
 */
function checkRateLimit(identifier, limit = 10, windowMs = 60000) {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const requests = global.rateLimitStore.get(identifier) || [];
  const recentRequests = requests.filter(time => time > windowStart);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  global.rateLimitStore.set(identifier, recentRequests);

  return true;
}

/**
 * Validates content for malicious patterns
 * @param {string} content - Content to validate
 * @returns {boolean} True if content is safe
 */
function validateContent(content) {
  if (typeof content !== 'string') return true;

  // Check for common attack patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /document\./i,
    /window\./i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Generates a secure filename
 * @param {string} originalName - Original filename
 * @returns {string} Secure filename
 */
function generateSecureFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop().toLowerCase();

  return `${timestamp}-${random}.${extension}`;
}

module.exports = {
  sanitizePath,
  sanitizeInput,
  validateFileOperation,
  checkRateLimit,
  validateContent,
  generateSecureFilename,
};