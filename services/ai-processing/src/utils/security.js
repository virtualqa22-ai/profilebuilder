// Security validation and sanitization utilities
// Provides protection against prompt injection, input validation, and data sanitization

const { SECURITY_CONFIG, VALIDATION_RULES } = require('./constants');
const { error: logError, warn: logWarn } = require('./logger');

/**
 * Validate prompt for potential injection attacks
 * @param {string} prompt - The prompt to validate
 * @returns {Object} - Validation result with valid flag and reason
 */
function validatePrompt(prompt) {
  if (typeof prompt !== 'string') {
    return { valid: false, reason: 'Prompt must be a string' };
  }

  const lowerPrompt = prompt.toLowerCase();

  // Check for dangerous patterns
  for (const danger of SECURITY_CONFIG.PROMPT_INJECTION_PATTERNS) {
    if (lowerPrompt.includes(danger)) {
      logWarn('Potential prompt injection detected', {
        pattern: danger,
        promptLength: prompt.length,
      });

      return {
        valid: false,
        reason: `Potentially dangerous content: ${danger}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate content type, size, and safety
 * @param {any} content - Content to validate
 * @param {number} maxSize - Maximum allowed size in characters
 * @returns {Object} - Validation result
 */
function validateContent(content, maxSize = VALIDATION_RULES.MAX_TEXT_LENGTH) {
  // Type validation
  if (typeof content !== 'string') {
    return { valid: false, reason: 'Content must be a string' };
  }

  // Empty content check
  if (content.length === 0) {
    return { valid: false, reason: 'Content cannot be empty' };
  }

  // Size validation
  if (content.length > maxSize) {
    return {
      valid: false,
      reason: `Content exceeds maximum size of ${maxSize} characters`,
    };
  }

  // Binary content check (control characters)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(content)) {
    return { valid: false, reason: 'Content contains invalid characters' };
  }

  // Additional security checks
  const securityResult = validatePrompt(content);
  if (!securityResult.valid) {
    return securityResult;
  }

  return { valid: true };
}

/**
 * Sanitize data for logging by redacting sensitive information
 * @param {Object} data - Data object to sanitize
 * @returns {Object} - Sanitized data object
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Redact sensitive fields
  for (const field of SECURITY_CONFIG.SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Advanced input sanitization for AI prompts
 * Removes potentially harmful content while preserving useful text
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeAIInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, ''); // onclick="..."
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, ''); // onclick='...'

  // Remove potential system prompt override attempts
  const overridePatterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s+prompt/gi,
    /you\s+are\s+now/gi,
    /forget\s+your/gi,
    /bypass\s+rules/gi,
  ];

  for (const pattern of overridePatterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Check if input contains suspicious patterns
 * @param {string} input - Input to check
 * @returns {Array} - Array of detected suspicious patterns
 */
function detectSuspiciousPatterns(input) {
  if (typeof input !== 'string') {
    return [];
  }

  const suspicious = [];
  const lowerInput = input.toLowerCase();

  // Check for common attack patterns
  const patterns = [
    'ignore previous instructions',
    'system prompt',
    'you are now',
    'forget your',
    'bypass',
    'override',
    'jailbreak',
    'dan mode',
    'uncensored',
    'unrestricted',
  ];

  for (const pattern of patterns) {
    if (lowerInput.includes(pattern)) {
      suspicious.push(pattern);
    }
  }

  if (suspicious.length > 0) {
    logWarn('Suspicious patterns detected in input', {
      patterns: suspicious,
      inputLength: input.length,
    });
  }

  return suspicious;
}

/**
 * Validate API key format and security
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - True if valid
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Basic format validation (should be reasonably long and contain mixed characters)
  if (apiKey.length < 20) {
    return false;
  }

  // Check for common weak patterns
  const weakPatterns = [
    /^123/,
    /^abc/i,
    /password/i,
    /admin/i,
    /test/i,
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(apiKey)) {
      logWarn('Potentially weak API key detected');
      return false;
    }
  }

  return true;
}

module.exports = {
  validatePrompt,
  validateContent,
  sanitizeForLogging,
  sanitizeAIInput,
  detectSuspiciousPatterns,
  validateApiKey,
};