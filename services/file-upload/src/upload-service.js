// File Upload Service - Main service class
// Orchestrates file upload operations with validation, processing, storage, and monitoring

const crypto = require('crypto');
const { validateFile } = require('./utils/validation');
const { performSecurityScan } = require('./utils/security');
const { fileProcessor } = require('./utils/file-processor');
const { createStorage } = require('./utils/storage');
const { uploadProgressTracker } = require('./utils/progress-tracker');
const { uploadMetricsTracker } = require('./utils/performance');
const { createUploadError, handleUploadError } = require('./utils/error-handling');
const { info: logInfo, error: logError } = require('./utils/logger');
const { UPLOAD, PROCESSING_OPERATIONS, STORAGE_TYPES, ERROR_CODES } = require('./utils/constants');

/**
 * File Upload Service class
 * Main service for handling file uploads with comprehensive features
 */
class FileUploadService {
  constructor(options = {}) {
    this.options = {
      storageType: STORAGE_TYPES.LOCAL,
      maxConcurrentUploads: UPLOAD.MAX_CONCURRENT_UPLOADS,
      enableProgressTracking: true,
      enableMetrics: true,
      ...options,
    };

    this.storage = createStorage(this.options.storageType, this.options.storageOptions);
    this.activeUploads = new Set();
  }

  /**
   * Handle file upload with full processing pipeline
   * @param {Object} file - File object from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async handleUpload(file, options = {}) {
    const uploadId = this.generateUploadId();
    const startTime = Date.now();

    // Track active upload
    this.activeUploads.add(uploadId);

    try {
      logInfo('Starting file upload', {
        uploadId,
        filename: file.originalname,
        size: file.size,
      });

      // Start progress tracking
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.startUpload(uploadId, file, options.metadata);
      }

      // 1. Validate file
      const validation = validateFile(file, {
        allowedTypes: options.allowedTypes,
        maxSizeMB: options.maxSizeMB,
      });

      if (!validation.valid) {
        throw createUploadError(
          ERROR_CODES.VALIDATION_ERROR,
          'File validation failed'
        );
      }

      // Update progress
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.updateProgress(uploadId, file.size * 0.1);
      }

      // 2. Security scan
      const securityScan = performSecurityScan(file);
      if (!securityScan.passed) {
        throw createUploadError(
          ERROR_CODES.SECURITY_ERROR,
          'Security scan failed'
        );
      }

      // Update progress
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.updateProgress(uploadId, file.size * 0.3);
      }

      // 3. Process file (validation, scanning, conversion)
      const operations = [
        { type: PROCESSING_OPERATIONS.VALIDATE },
        { type: PROCESSING_OPERATIONS.SCAN },
      ];

      if (options.convertTo) {
        operations.push({
          type: PROCESSING_OPERATIONS.CONVERT,
          format: options.convertTo,
        });
      }

      const processingResults = await fileProcessor.processFile(file, operations);

      // Update progress
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.updateProgress(uploadId, file.size * 0.6);
      }

      // 4. Store file
      const storageResult = await this.storage.uploadFile
        ? await this.storage.uploadFile(file, options.storage || {})
        : await this.storage.saveFile(file, options.storage || {});

      // Update progress
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.updateProgress(uploadId, file.size);
      }

      // 5. Track metrics
      if (this.options.enableMetrics) {
        const uploadTime = Date.now() - startTime;
        uploadMetricsTracker.trackUpload(uploadTime, file.size, true);
      }

      const result = {
        success: true,
        uploadId,
        fileId: storageResult.key || storageResult.filename,
        filename: file.originalname,
        size: file.size,
        url: storageResult.location || storageResult.url,
        checksum: processingResults.validation?.checksum,
        processing: processingResults,
        uploadedAt: new Date().toISOString(),
      };

      logInfo('File upload completed successfully', {
        uploadId,
        fileId: result.fileId,
        processingTime: Date.now() - startTime,
      });

      return result;

    } catch (uploadError) {
      // Track failed upload
      if (this.options.enableMetrics) {
        const uploadTime = Date.now() - startTime;
        uploadMetricsTracker.trackUpload(uploadTime, file.size, false, uploadError.message);
      }

      // Mark progress as failed
      if (this.options.enableProgressTracking) {
        uploadProgressTracker.failUpload(uploadId, uploadError.message);
      }

      logError('File upload failed', {
        uploadId,
        filename: file.originalname,
        error: uploadError.message,
      });

      throw uploadError;

    } finally {
      // Clean up active upload tracking
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Handle multiple file uploads concurrently
   * @param {Array} files - Array of file objects
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} - Array of upload results
   */
  async handleBatchUpload(files, options = {}) {
    const maxConcurrent = options.maxConcurrent || this.options.maxConcurrentUploads;
    const results = [];

    logInfo('Starting batch upload', {
      fileCount: files.length,
      maxConcurrent,
    });

    // Process files in batches to control concurrency
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(file =>
        this.handleUpload(file, options).catch(error => ({
          success: false,
          filename: file.originalname,
          error: error.message,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logInfo('Batch upload completed', {
      total: results.length,
      successful: successCount,
      failed: failureCount,
    });

    return results;
  }

  /**
   * Get upload progress
   * @param {string} uploadId - Upload identifier
   * @returns {Object|null} - Progress data or null
   */
  getUploadProgress(uploadId) {
    return uploadProgressTracker.getProgress(uploadId);
  }

  /**
   * Get upload statistics
   * @returns {Object} - Upload statistics
   */
  getUploadStatistics() {
    return {
      activeUploads: this.activeUploads.size,
      progressStats: uploadProgressTracker.getStatistics(),
      performanceStats: uploadMetricsTracker.getMetrics(),
    };
  }

  /**
   * Cancel upload
   * @param {string} uploadId - Upload identifier
   * @returns {boolean} - Success status
   */
  cancelUpload(uploadId) {
    if (this.activeUploads.has(uploadId)) {
      uploadProgressTracker.cancelUpload(uploadId);
      this.activeUploads.delete(uploadId);
      logInfo('Upload cancelled', { uploadId });
      return true;
    }
    return false;
  }

  /**
   * Clean up old completed/failed uploads
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanup(maxAge = 3600000) { // 1 hour default
    uploadProgressTracker.cleanup(maxAge);
    logInfo('Upload cleanup completed');
  }

  /**
   * Generate unique upload ID
   * @returns {string} - Unique upload identifier
   */
  generateUploadId() {
    return `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Health check for the service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const stats = this.getUploadStatistics();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        statistics: stats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

module.exports = {
  FileUploadService,
  fileUploadService,
};