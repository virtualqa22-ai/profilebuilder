// Validation utilities for Document Generation Service
// Provides comprehensive input validation and data sanitization

const { VALIDATION_RULES, SECURITY_CONFIG } = require('./constants');

/**
 * Validates document data for generation
 * @param {Object} data - Document data to validate
 * @returns {Array} Array of validation error messages
 */
function validateDocumentData(data) {
  const errors = [];

  // Required fields
  const required = ['name', 'contact'];
  required.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Email validation
  if (data.contact?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contact.email)) {
      errors.push('Invalid email format');
    }
  }

  // Experience validation
  if (data.experience) {
    if (!Array.isArray(data.experience)) {
      errors.push('Experience must be an array');
    } else {
      data.experience.forEach((exp, index) => {
        if (!exp.company || !exp.position) {
          errors.push(`Experience ${index + 1} missing company or position`);
        }
      });
    }
  }

  // Content size limits
  const maxTextLength = VALIDATION_RULES.MAX_TEXT_LENGTH;
  const textContent = JSON.stringify(data);
  if (textContent.length > maxTextLength) {
    errors.push(`Document content exceeds maximum size of ${maxTextLength} characters`);
  }

  return errors;
}

/**
 * Validates file path for security and correctness
 * @param {string} path - File path to validate
 * @returns {Array} Array of validation error messages
 */
function validatePath(path) {
  const errors = [];

  if (!path || typeof path !== 'string') {
    errors.push('Path must be a non-empty string');
    return errors; // Return early for empty strings
  }

  // Check for directory traversal
  if (path.includes('..') || path.includes('../')) {
    errors.push('Path contains invalid directory traversal');
  }

  // Check for absolute paths (if not allowed)
  if (path.startsWith('/') && !path.startsWith('/allowed')) {
    errors.push('Absolute paths not allowed');
  }

  // Check file extension
  const allowedExtensions = VALIDATION_RULES.VALID_FORMATS.map(ext => `.${ext}`);
  const hasValidExtension = allowedExtensions.some(ext => path.endsWith(ext));
  if (!hasValidExtension) {
    errors.push('File must have valid extension (.pdf, .docx, .txt)');
  }

  return errors;
}

/**
 * Validates template structure
 * @param {Object} template - Template object to validate
 * @returns {Array} Array of validation error messages
 */
function validateTemplate(template) {
  const errors = [];

  if (!template.name) errors.push('Template name is required');
  if (!template.content && !template.sections) {
    errors.push('Template must have content or sections');
  }
  if (template.fontSize && (template.fontSize < VALIDATION_RULES.FONT_SIZE_MIN || template.fontSize > VALIDATION_RULES.FONT_SIZE_MAX)) {
    errors.push(`Font size must be between ${VALIDATION_RULES.FONT_SIZE_MIN} and ${VALIDATION_RULES.FONT_SIZE_MAX}`);
  }

  return errors;
}

/**
 * Validates resume data specifically
 * @param {Object} data - Resume data to validate
 * @returns {Array} Array of validation error messages
 */
function validateResumeData(data) {
  const errors = [];

  if (!data.name || !data.email) {
    errors.push('Missing required fields: name and email');
  }

  // Additional resume-specific validations can be added here

  return errors;
}

/**
 * Sanitizes input data by removing sensitive fields
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
  const sanitized = { ...data };

  // Remove sensitive fields
  SECURITY_CONFIG.SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  return sanitized;
}

/**
 * Validates file size
 * @param {number} size - File size in bytes
 * @returns {boolean} True if size is valid
 */
function validateFileSize(size) {
  return size >= VALIDATION_RULES.MIN_FILE_SIZE && size <= VALIDATION_RULES.MAX_FILE_SIZE;
}

module.exports = {
  validateDocumentData,
  validatePath,
  validateTemplate,
  validateResumeData,
  sanitizeData,
  validateFileSize,
};