// File storage utilities for S3 and local storage
// Provides secure file storage with error handling and cleanup

const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const { UPLOAD, STORAGE_TYPES, MESSAGES, ERROR_CODES } = require('./constants');
const { createUploadError, processWithRetry, safeCleanup } = require('./error-handling');
const { info: logInfo, error: logError } = require('./logger');

/**
 * S3 Storage class for AWS S3 operations
 */
class S3Storage {
  constructor(options = {}) {
    const {
      accessKeyId = process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY,
      region = UPLOAD.S3_REGION,
      bucket = process.env.S3_BUCKET || UPLOAD.S3_BUCKET_DEFAULT,
    } = options;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not provided');
    }

    this.s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
    });

    this.bucket = bucket;
    logInfo('S3 storage initialized', { region, bucket });
  }

  /**
   * Upload file to S3
   * @param {Object} file - File object with buffer, originalname, mimetype
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result with location and key
   */
  async uploadFile(file, options = {}) {
    const {
      bucket = this.bucket,
      key,
      acl = 'private',
      metadata = {},
    } = options;

    const fileKey = key || `uploads/${Date.now()}-${file.originalname}`;

    const uploadParams = {
      Bucket: bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: acl,
      Metadata: metadata,
    };

    try {
      logInfo('Starting S3 upload', { key: fileKey, size: file.size, bucket });

      const result = await processWithRetry(() => this.s3.upload(uploadParams).promise());

      logInfo('S3 upload completed', {
        key: result.Key,
        location: result.Location,
        bucket: result.Bucket,
      });

      return {
        success: true,
        key: result.Key,
        location: result.Location,
        bucket: result.Bucket,
        size: file.size,
      };
    } catch (uploadError) {
      logError('S3 upload failed', {
        key: fileKey,
        error: uploadError.message,
        bucket,
      });

      throw createUploadError(
        ERROR_CODES.STORAGE_ERROR,
        `S3 upload failed: ${uploadError.message}`
      );
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @param {string} bucket - S3 bucket name
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(key, bucket = this.bucket) {
    try {
      await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      logInfo('S3 file deleted', { key, bucket });
      return true;
    } catch (deleteError) {
      logError('S3 delete failed', { key, bucket, error: deleteError.message });
      return false;
    }
  }

  /**
   * Get signed URL for file access
   * @param {string} key - S3 object key
   * @param {number} expires - URL expiration time in seconds
   * @returns {string} - Signed URL
   */
  getSignedUrl(key, expires = 3600) {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expires,
    });
  }
}

/**
 * Local Storage class for filesystem operations
 */
class LocalStorage {
  constructor(options = {}) {
    this.uploadPath = options.uploadPath || UPLOAD.DEFAULT_UPLOAD_PATH;
    this.tempPath = options.tempPath || UPLOAD.TEMP_PATH;
  }

  /**
   * Save file to local storage
   * @param {Object} file - File object with buffer, originalname
   * @param {Object} options - Save options
   * @returns {Promise<Object>} - Save result with filepath and filename
   */
  async saveFile(file, options = {}) {
    const {
      uploadPath = this.uploadPath,
      filename,
    } = options;

    const finalFilename = filename || `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadPath, finalFilename);

    try {
      // Ensure directory exists
      await fs.mkdir(uploadPath, { recursive: true });

      // Write file
      await fs.writeFile(filepath, file.buffer);

      logInfo('File saved to local storage', {
        filepath,
        filename: finalFilename,
        size: file.size,
      });

      return {
        success: true,
        filepath,
        filename: finalFilename,
        size: file.size,
        url: `/uploads/${finalFilename}`, // Relative URL for serving
      };
    } catch (saveError) {
      logError('Local storage save failed', {
        filepath,
        error: saveError.message,
      });

      throw createUploadError(
        ERROR_CODES.STORAGE_ERROR,
        `Local storage save failed: ${saveError.message}`
      );
    }
  }

  /**
   * Delete file from local storage
   * @param {string} filepath - File path to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(filepath) {
    try {
      await safeCleanup(() => fs.unlink(filepath));
      logInfo('Local file deleted', { filepath });
      return true;
    } catch (deleteError) {
      logError('Local file delete failed', { filepath, error: deleteError.message });
      return false;
    }
  }

  /**
   * Move file from temp to permanent location
   * @param {string} tempPath - Temporary file path
   * @param {string} finalPath - Final file path
   * @returns {Promise<Object>} - Move result
   */
  async moveFile(tempPath, finalPath) {
    try {
      const finalDir = path.dirname(finalPath);
      await fs.mkdir(finalDir, { recursive: true });
      await fs.rename(tempPath, finalPath);

      logInfo('File moved', { from: tempPath, to: finalPath });

      return {
        success: true,
        filepath: finalPath,
      };
    } catch (moveError) {
      logError('File move failed', {
        from: tempPath,
        to: finalPath,
        error: moveError.message,
      });

      throw createUploadError(
        ERROR_CODES.STORAGE_ERROR,
        `File move failed: ${moveError.message}`
      );
    }
  }
}

/**
 * Storage factory function
 * @param {string} type - Storage type ('s3' or 'local')
 * @param {Object} options - Storage options
 * @returns {S3Storage|LocalStorage} - Storage instance
 */
function createStorage(type, options = {}) {
  switch (type) {
    case STORAGE_TYPES.S3:
      return new S3Storage(options);
    case STORAGE_TYPES.LOCAL:
      return new LocalStorage(options);
    default:
      throw new Error(`Unsupported storage type: ${type}`);
  }
}

/**
 * Get file stats
 * @param {string} filepath - File path
 * @returns {Promise<Object>} - File stats
 */
async function getFileStats(filepath) {
  try {
    const stats = await fs.stat(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
    };
  } catch (error) {
    logError('Failed to get file stats', { filepath, error: error.message });
    return null;
  }
}

// Create default storage instances
const localStorage = new LocalStorage();

module.exports = {
  S3Storage,
  LocalStorage,
  createStorage,
  getFileStats,
  localStorage,
};