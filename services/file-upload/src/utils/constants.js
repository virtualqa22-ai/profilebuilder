// File Upload Service Constants
// Centralized configuration for file upload operations, limits, and messages

const UPLOAD = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB default
  MAX_FILE_SIZE_MB: 10,

  // Allowed file types
  ALLOWED_TYPES: ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png'],

  // Upload paths
  DEFAULT_UPLOAD_PATH: './uploads',
  TEMP_PATH: './temp',

  // S3 configuration
  S3_BUCKET_DEFAULT: 'default-bucket',
  S3_REGION: process.env.AWS_REGION || 'us-east-1',

  // Processing timeouts (in milliseconds)
  VIRUS_SCAN_TIMEOUT: 30000, // 30 seconds
  FILE_CONVERSION_TIMEOUT: 60000, // 1 minute

  // Concurrent upload limits
  MAX_CONCURRENT_UPLOADS: 10,

  // Progress tracking
  PROGRESS_UPDATE_INTERVAL: 1000, // 1 second
};

const MESSAGES = {
  SUCCESS: {
    UPLOAD_COMPLETED: 'File uploaded successfully',
    PROCESSING_COMPLETED: 'File processing completed',
    VALIDATION_PASSED: 'File validation passed',
  },

  ERRORS: {
    FILE_TOO_LARGE: 'File size exceeds limit of {maxSize}MB',
    INVALID_FILE_TYPE: 'File type not allowed. Allowed types: {allowedTypes}',
    NO_FILE_PROVIDED: 'No file provided',
    UPLOAD_FAILED: 'File upload failed',
    PROCESSING_FAILED: 'File processing failed',
    STORAGE_FAILED: 'File storage failed',
    VIRUS_DETECTED: 'Virus detected in file',
    INVALID_METADATA: 'Invalid file metadata',
    DIRECTORY_TRAVERSAL: 'Directory traversal attempt detected',
    MALICIOUS_CONTENT: 'Malicious content detected',
    CONCURRENT_LIMIT_EXCEEDED: 'Maximum concurrent uploads exceeded',
    INTERNAL_ERROR: 'Internal server error',
  },

  VALIDATION: {
    FILENAME_REQUIRED: 'Filename is required',
    MIMETYPE_REQUIRED: 'MIME type is required',
    FILENAME_TOO_LONG: 'Filename too long (max 255 characters)',
    INVALID_MIME_FORMAT: 'Invalid MIME type format',
  },

  LOGGING: {
    UPLOAD_STARTED: 'File upload started',
    UPLOAD_COMPLETED: 'File upload completed',
    UPLOAD_FAILED: 'File upload failed',
    PROCESSING_STARTED: 'File processing started',
    PROCESSING_COMPLETED: 'File processing completed',
    CLEANUP_STARTED: 'Cleanup started',
    CLEANUP_COMPLETED: 'Cleanup completed',
  },
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

const PROCESSING_OPERATIONS = {
  VALIDATE: 'validate',
  SCAN: 'scan',
  CONVERT: 'convert',
};

const STORAGE_TYPES = {
  S3: 's3',
  LOCAL: 'local',
};

const LOGGING_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  FORMAT: 'json',
};

module.exports = {
  UPLOAD,
  MESSAGES,
  ERROR_CODES,
  HTTP_STATUS,
  PROCESSING_OPERATIONS,
  STORAGE_TYPES,
  LOGGING_CONFIG,
};