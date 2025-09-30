// Multer middleware configuration for file upload service
// Provides secure file upload handling with validation and limits

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { UPLOAD, MESSAGES, ERROR_CODES } = require('./constants');
const { createUploadError } = require('./error-handling');
const { info: logInfo, error: logError } = require('./logger');

/**
 * Create multer storage configuration for memory storage
 * @returns {multer.StorageEngine} - Multer memory storage engine
 */
function createMemoryStorage() {
  return multer.memoryStorage();
}

/**
 * Create multer storage configuration for disk storage
 * @param {string} uploadPath - Path where files should be stored
 * @returns {multer.StorageEngine} - Multer disk storage engine
 */
function createDiskStorage(uploadPath = UPLOAD.DEFAULT_UPLOAD_PATH) {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // Ensure upload directory exists
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
      } catch (error) {
        logError('Failed to create upload directory', { uploadPath, error: error.message });
        cb(createUploadError(ERROR_CODES.STORAGE_ERROR, 'Failed to create upload directory'), null);
      }
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const basename = path.basename(file.originalname, extension);
      const filename = `${basename}-${uniqueSuffix}${extension}`;

      logInfo('Generated filename for upload', { originalName: file.originalname, filename });
      cb(null, filename);
    },
  });
}

/**
 * File filter function for multer
 * @param {Array} allowedTypes - Array of allowed file extensions
 * @returns {Function} - Multer file filter function
 */
function createFileFilter(allowedTypes = UPLOAD.ALLOWED_TYPES) {
  return (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

    if (allowedTypes.includes(fileExtension)) {
      logInfo('File type accepted', { filename: file.originalname, type: fileExtension });
      cb(null, true);
    } else {
      const error = createUploadError(
        ERROR_CODES.VALIDATION_ERROR,
        MESSAGES.ERRORS.INVALID_FILE_TYPE.replace('{allowedTypes}', allowedTypes.join(', '))
      );
      logError('File type rejected', { filename: file.originalname, type: fileExtension, allowedTypes });
      cb(error, false);
    }
  };
}

/**
 * Create multer upload middleware configuration
 * @param {Object} options - Configuration options
 * @returns {multer.Multer} - Configured multer instance
 */
function createUploadMiddleware(options = {}) {
  const {
    storage = 'memory', // 'memory' or 'disk'
    uploadPath = UPLOAD.DEFAULT_UPLOAD_PATH,
    allowedTypes = UPLOAD.ALLOWED_TYPES,
    maxFileSize = UPLOAD.MAX_FILE_SIZE,
    maxFiles = 1,
  } = options;

  let multerStorage;

  if (storage === 'memory') {
    multerStorage = createMemoryStorage();
  } else if (storage === 'disk') {
    multerStorage = createDiskStorage(uploadPath);
  } else {
    throw new Error('Invalid storage type. Must be "memory" or "disk"');
  }

  const upload = multer({
    storage: multerStorage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
  });

  logInfo('Upload middleware configured', {
    storage,
    uploadPath,
    allowedTypes,
    maxFileSize: maxFileSize / (1024 * 1024) + 'MB',
    maxFiles,
  });

  return upload;
}

/**
 * Single file upload middleware
 * @param {string} fieldName - Name of the form field
 * @param {Object} options - Upload options
 * @returns {Function} - Express middleware function
 */
function singleFileUpload(fieldName = 'file', options = {}) {
  const upload = createUploadMiddleware(options);
  return upload.single(fieldName);
}

/**
 * Multiple files upload middleware
 * @param {string} fieldName - Name of the form field
 * @param {number} maxCount - Maximum number of files
 * @param {Object} options - Upload options
 * @returns {Function} - Express middleware function
 */
function multipleFilesUpload(fieldName = 'files', maxCount = 5, options = {}) {
  const uploadOptions = { ...options, maxFiles: maxCount };
  const upload = createUploadMiddleware(uploadOptions);
  return upload.array(fieldName, maxCount);
}

/**
 * Mixed file upload middleware (different fields)
 * @param {Array} fields - Array of field configurations
 * @param {Object} options - Upload options
 * @returns {Function} - Express middleware function
 */
function mixedFilesUpload(fields = [], options = {}) {
  const upload = createUploadMiddleware(options);
  return upload.fields(fields);
}

/**
 * Error handling middleware for multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    let message;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = MESSAGES.ERRORS.FILE_TOO_LARGE.replace('{maxSize}', UPLOAD.MAX_FILE_SIZE_MB);
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field';
        break;
      default:
        message = 'File upload error';
    }

    const uploadError = createUploadError(ERROR_CODES.UPLOAD_ERROR, message);
    logError('Multer error occurred', { code: error.code, message: error.message });
    return next(uploadError);
  }

  // Pass through non-multer errors
  next(error);
}

module.exports = {
  createUploadMiddleware,
  singleFileUpload,
  multipleFilesUpload,
  mixedFilesUpload,
  handleMulterError,
  createMemoryStorage,
  createDiskStorage,
  createFileFilter,
};