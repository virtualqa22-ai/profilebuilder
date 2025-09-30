// Security utilities for file upload service
// Provides protection against malicious uploads, directory traversal, and content validation

const { error: logError, warn: logWarn } = require('./logger');
const { ERROR_CODES } = require('./constants');

/**
 * Check for malicious content in filename and file content
 * @param {string} filename - The filename to check
 * @param {Buffer|string} content - The file content to check
 * @returns {Object} - Security check result with safe flag and threats array
 */
function checkForMaliciousContent(filename, content) {
  const threats = [];

  // Check for directory traversal attempts
  if (filename.includes('..') || filename.includes('../') || filename.includes('..\\')) {
    threats.push('Directory traversal attempt');
  }

  // Check for suspicious filenames
  const suspiciousPatterns = [
    /^\./,  // Hidden files
    /[<>:*?"|]/,  // Invalid filename characters
    /\.(exe|bat|cmd|com|scr|pif|jar|war)$/i,  // Executable extensions
    /\.(php|asp|jsp|py|pl|sh|bash)$/i,  // Script extensions
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      threats.push(`Suspicious filename pattern: ${pattern}`);
      break;
    }
  }

  // Check content for malicious patterns
  if (content) {
    const contentStr = content.toString();

    // Check for script injection
    if (contentStr.includes('<script>') || contentStr.includes('javascript:') || contentStr.includes('vbscript:')) {
      threats.push('Script injection detected');
    }

    // Check for binary content in text files (null bytes)
    if (filename.endsWith('.txt') && contentStr.includes('\x00')) {
      threats.push('Binary content in text file');
    }

    // Check for embedded executables (MZ header for Windows executables)
    if (contentStr.startsWith('MZ')) {
      threats.push('Executable content detected');
    }

    // Check for PHP/ASP injection attempts
    if (contentStr.includes('<?php') || contentStr.includes('<%') || contentStr.includes('<%=') || contentStr.includes('<%=')) {
      threats.push('Server-side script injection detected');
    }
  }

  const safe = threats.length === 0;

  if (!safe) {
    logWarn('Malicious content detected', {
      filename,
      threats,
      contentLength: content ? content.length : 0,
    });
  }

  return {
    safe,
    threats,
  };
}

/**
 * Validate file metadata for security
 * @param {Object} file - File object with metadata
 * @returns {Object} - Validation result with valid flag and issues array
 */
function validateFileMetadata(file) {
  const issues = [];

  // Filename validation
  if (!file.originalname || file.originalname.trim() === '') {
    issues.push('Filename is required');
  }

  if (file.originalname && file.originalname.length > 255) {
    issues.push('Filename too long (max 255 characters)');
  }

  // MIME type validation
  if (!file.mimetype) {
    issues.push('MIME type is required');
  }

  if (file.mimetype) {
    // Validate MIME type format
    const mimeRegex = /^[a-z]+\/[a-z+\-\.]+$/;
    if (!mimeRegex.test(file.mimetype)) {
      issues.push('Invalid MIME type format');
    }

    // Check for suspicious MIME types
    const suspiciousMimes = [
      'application/x-msdownload',  // .exe files
      'application/x-executable',
      'application/x-dosexec',
    ];

    if (suspiciousMimes.includes(file.mimetype.toLowerCase())) {
      issues.push('Suspicious MIME type detected');
    }
  }

  // File size validation (basic check)
  if (file.size && file.size < 0) {
    issues.push('Invalid file size');
  }

  const valid = issues.length === 0;

  if (!valid) {
    logWarn('File metadata validation failed', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      issues,
    });
  }

  return {
    valid,
    issues,
  };
}

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename) return 'unnamed_file';

  // Remove path separators and directory traversal attempts
  let sanitized = filename.replace(/[/\\:*?"<>|]/g, '_');

  // Remove multiple dots and leading/trailing dots
  sanitized = sanitized.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  // Ensure we have a filename
  if (!sanitized) sanitized = 'unnamed_file';

  return sanitized;
}

/**
 * Generate secure random filename
 * @param {string} originalFilename - Original filename for extension
 * @returns {string} - Secure random filename
 */
function generateSecureFilename(originalFilename) {
  const crypto = require('crypto');
  const randomId = crypto.randomBytes(16).toString('hex');

  if (originalFilename) {
    const ext = originalFilename.split('.').pop();
    return `${randomId}.${ext}`;
  }

  return randomId;
}

/**
 * Check if file type is allowed
 * @param {string} filename - Filename to check
 * @param {Array} allowedTypes - Array of allowed file extensions
 * @returns {boolean} - True if allowed
 */
function isAllowedFileType(filename, allowedTypes = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png']) {
  if (!filename) return false;

  const extension = filename.split('.').pop().toLowerCase();
  return allowedTypes.includes(extension);
}

/**
 * Perform comprehensive security scan on uploaded file
 * @param {Object} file - File object to scan
 * @returns {Object} - Security scan result
 */
function performSecurityScan(file) {
  const results = {
    passed: true,
    checks: [],
  };

  // Filename security check
  const filenameCheck = checkForMaliciousContent(file.originalname, null);
  results.checks.push({
    name: 'filename_security',
    passed: filenameCheck.safe,
    details: filenameCheck.threats,
  });

  // Metadata validation
  const metadataCheck = validateFileMetadata(file);
  results.checks.push({
    name: 'metadata_validation',
    passed: metadataCheck.valid,
    details: metadataCheck.issues,
  });

  // File type validation
  const typeCheck = isAllowedFileType(file.originalname);
  results.checks.push({
    name: 'file_type_validation',
    passed: typeCheck,
    details: typeCheck ? [] : ['File type not allowed'],
  });

  // Content security check (if buffer available)
  if (file.buffer) {
    const contentCheck = checkForMaliciousContent(file.originalname, file.buffer);
    results.checks.push({
      name: 'content_security',
      passed: contentCheck.safe,
      details: contentCheck.threats,
    });
  }

  // Overall result
  results.passed = results.checks.every(check => check.passed);

  if (!results.passed) {
    logError('Security scan failed', {
      filename: file.originalname,
      failedChecks: results.checks.filter(c => !c.passed),
    });
  }

  return results;
}

module.exports = {
  checkForMaliciousContent,
  validateFileMetadata,
  sanitizeFilename,
  generateSecureFilename,
  isAllowedFileType,
  performSecurityScan,
};