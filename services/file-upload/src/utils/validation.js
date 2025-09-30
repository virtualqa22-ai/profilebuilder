// File validation utilities for file upload service
// Provides comprehensive validation for file types, sizes, and metadata

const { UPLOAD, MESSAGES, ERROR_CODES } = require('./constants');
const { createUploadError } = require('./error-handling');

/**
 * Validate file type against allowed types
 * @param {Object} file - File object with mimetype and originalname
 * @param {Array} allowedTypes - Array of allowed file extensions
 * @returns {Object} - Validation result with valid flag and error if invalid
 */
function validateFileType(file, allowedTypes = UPLOAD.ALLOWED_TYPES) {
  if (!file) {
    return {
      valid: false,
      error: createUploadError(ERROR_CODES.VALIDATION_ERROR, MESSAGES.ERRORS.NO_FILE_PROVIDED),
    };
  }

  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  const isValidType = allowedTypes.includes(fileExtension);

  if (!isValidType) {
    return {
      valid: false,
      error: createUploadError(
        ERROR_CODES.VALIDATION_ERROR,
        MESSAGES.ERRORS.INVALID_FILE_TYPE
          .replace('{allowedTypes}', allowedTypes.join(', '))
      ),
    };
  }

  return { valid: true };
}

/**
 * Validate file size against maximum limit
 * @param {Object} file - File object with size property
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Object} - Validation result with valid flag and error if invalid
 */
function validateFileSize(file, maxSizeMB = UPLOAD.MAX_FILE_SIZE_MB) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file || !file.size) {
    return {
      valid: false,
      error: createUploadError(ERROR_CODES.VALIDATION_ERROR, MESSAGES.ERRORS.FILE_TOO_LARGE.replace('{maxSize}', maxSizeMB)),
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: createUploadError(
        ERROR_CODES.VALIDATION_ERROR,
        MESSAGES.ERRORS.FILE_TOO_LARGE.replace('{maxSize}', maxSizeMB)
      ),
    };
  }

  return { valid: true };
}

/**
 * Validate file metadata (filename, mimetype, etc.)
 * @param {Object} file - File object to validate
 * @returns {Object} - Validation result with valid flag and issues array
 */
function validateFileMetadata(file) {
  const issues = [];

  // Filename validation
  if (!file.originalname || file.originalname.trim() === '') {
    issues.push(MESSAGES.VALIDATION.FILENAME_REQUIRED);
  }

  if (file.originalname && file.originalname.length > 255) {
    issues.push(MESSAGES.VALIDATION.FILENAME_TOO_LONG);
  }

  // MIME type validation
  if (!file.mimetype) {
    issues.push(MESSAGES.VALIDATION.MIMETYPE_REQUIRED);
  }

  if (file.mimetype) {
    // Validate MIME type format
    const mimeRegex = /^[a-z]+\/[a-z+\-\.]+$/;
    if (!mimeRegex.test(file.mimetype)) {
      issues.push(MESSAGES.VALIDATION.INVALID_MIME_FORMAT);
    }
  }

  // File size validation (basic check)
  if (file.size && file.size < 0) {
    issues.push('Invalid file size');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Comprehensive file validation combining all checks
 * @param {Object} file - File object to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Complete validation result
 */
function validateFile(file, options = {}) {
  const {
    allowedTypes = UPLOAD.ALLOWED_TYPES,
    maxSizeMB = UPLOAD.MAX_FILE_SIZE_MB,
  } = options;

  const results = {
    valid: true,
    errors: [],
    checks: {},
  };

  // File type validation
  const typeValidation = validateFileType(file, allowedTypes);
  results.checks.fileType = typeValidation;
  if (!typeValidation.valid) {
    results.valid = false;
    results.errors.push(typeValidation.error);
  }

  // File size validation
  const sizeValidation = validateFileSize(file, maxSizeMB);
  results.checks.fileSize = sizeValidation;
  if (!sizeValidation.valid) {
    results.valid = false;
    results.errors.push(sizeValidation.error);
  }

  // Metadata validation
  const metadataValidation = validateFileMetadata(file);
  results.checks.metadata = metadataValidation;
  if (!metadataValidation.valid) {
    results.valid = false;
    results.errors.push(createUploadError(
      ERROR_CODES.VALIDATION_ERROR,
      MESSAGES.ERRORS.INVALID_METADATA
    ));
  }

  return results;
}

/**
 * Validate multiple files
 * @param {Array} files - Array of file objects to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Batch validation result
 */
function validateFiles(files, options = {}) {
  const results = {
    valid: true,
    totalFiles: files.length,
    validFiles: [],
    invalidFiles: [],
    errors: [],
  };

  files.forEach((file, index) => {
    const fileValidation = validateFile(file, options);

    if (fileValidation.valid) {
      results.validFiles.push({
        index,
        file,
      });
    } else {
      results.valid = false;
      results.invalidFiles.push({
        index,
        file,
        errors: fileValidation.errors,
      });
      results.errors.push(...fileValidation.errors);
    }
  });

  return results;
}

/**
 * Check if file content appears to be safe
 * @param {Buffer} content - File content buffer
 * @param {string} filename - Filename for context
 * @returns {Object} - Content safety check result
 */
function validateFileContent(content, filename) {
  if (!content) {
    return { valid: true }; // Empty content is considered safe
  }

  const issues = [];

  // Check for null bytes (binary content in text files)
  if (filename.endsWith('.txt') && content.includes('\x00')) {
    issues.push('Binary content detected in text file');
  }

  // Check for script content in non-script files
  const contentStr = content.toString().toLowerCase();
  if (!filename.match(/\.(js|html|php|asp)$/i)) {
    if (contentStr.includes('<script') || contentStr.includes('javascript:')) {
      issues.push('Script content detected in non-script file');
    }
  }

  // Check for executable content
  if (contentStr.startsWith('MZ')) { // Windows executable
    issues.push('Executable content detected');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

module.exports = {
  validateFileType,
  validateFileSize,
  validateFileMetadata,
  validateFile,
  validateFiles,
  validateFileContent,
};