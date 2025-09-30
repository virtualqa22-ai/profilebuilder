// Request validation and sanitization utilities
// Provides comprehensive validation for AI processing requests

const { VALIDATION_RULES, MESSAGES } = require('./constants');

/**
 * Validate request payload structure
 * @param {Object} payload - Request payload to validate
 * @returns {Array} - Array of validation errors
 */
function validateRequest(payload) {
  const errors = [];

  // Check required fields
  const required = ['text', 'task'];
  for (const field of required) {
    if (!payload[field]) {
      errors.push(`${field} is required`);
    }
  }

  // Validate text length
  if (payload.text && payload.text.length > VALIDATION_RULES.MAX_TEXT_LENGTH) {
    errors.push(MESSAGES.ERRORS.TEXT_TOO_LONG);
  }

  // Validate task type
  if (payload.task && !VALIDATION_RULES.VALID_TASKS.includes(payload.task)) {
    errors.push(MESSAGES.ERRORS.INVALID_TASK);
  }

  return errors;
}

/**
 * Sanitize input text to prevent XSS and other attacks
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeInput(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove event handlers with quoted values
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    // Remove event handlers with single quoted values
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Rate limiting implementation
 * Tracks requests per user within a time window
 */
class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> timestamps array
  }

  /**
   * Check if request is allowed for the user
   * @param {string} userId - User identifier
   * @returns {Object} - {allowed: boolean, resetTime?: number}
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const windowStart = now - VALIDATION_RULES.RATE_LIMIT.WINDOW_MS;

    // Get or initialize user's request timestamps
    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }

    const userRequests = this.requests.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(userId, validRequests);

    // Check if under limit
    if (validRequests.length >= VALIDATION_RULES.RATE_LIMIT.MAX_REQUESTS) {
      const resetTime = validRequests[0] + VALIDATION_RULES.RATE_LIMIT.WINDOW_MS;
      return { allowed: false, resetTime };
    }

    // Add current request
    validRequests.push(now);
    return { allowed: true };
  }

  /**
   * Clean up old entries (optional maintenance)
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - VALIDATION_RULES.RATE_LIMIT.WINDOW_MS * 2; // Keep 2 windows worth

    for (const [userId, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > cutoff);
      if (validTimestamps.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validTimestamps);
      }
    }
  }
}

// Create singleton rate limiter
const rateLimiter = new RateLimiter();

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

module.exports = {
  validateRequest,
  sanitizeInput,
  rateLimiter,
  RateLimiter,
};