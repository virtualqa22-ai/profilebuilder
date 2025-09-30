// File Upload API Routes
// Express routes for file upload operations with comprehensive error handling

const express = require('express');
const { singleFileUpload, multipleFilesUpload, handleMulterError } = require('../utils/upload-middleware');
const { fileUploadService } = require('../upload-service');
const { handleUploadError } = require('../utils/error-handling');
const { info: logInfo } = require('../utils/logger');
const { HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

/**
 * @route POST /upload/single
 * @desc Upload a single file
 * @access Public
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options in request body
 */
router.post('/single', singleFileUpload(), async (req, res) => {
  try {
    const options = req.body || {};
    const result = await fileUploadService.handleUpload(req.file, options);

    logInfo('Single file upload completed', {
      filename: result.filename,
      uploadId: result.uploadId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'single file upload');
    res.status(this.getStatusCode(error)).json(errorResponse);
  }
});

/**
 * @route POST /upload/multiple
 * @desc Upload multiple files
 * @access Public
 * @param {Array<File>} files - The files to upload
 * @param {Object} options - Upload options in request body
 */
router.post('/multiple', multipleFilesUpload(), async (req, res) => {
  try {
    const options = req.body || {};
    const results = await fileUploadService.handleBatchUpload(req.files, options);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logInfo('Multiple file upload completed', {
      totalFiles: results.length,
      successful: successCount,
      failed: failureCount,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      },
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'multiple file upload');
    res.status(this.getStatusCode(error)).json(errorResponse);
  }
});

/**
 * @route GET /upload/progress/:uploadId
 * @desc Get upload progress
 * @access Public
 * @param {string} uploadId - Upload identifier
 */
router.get('/progress/:uploadId', (req, res) => {
  try {
    const { uploadId } = req.params;
    const progress = fileUploadService.getUploadProgress(uploadId);

    if (!progress) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Upload not found',
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'get upload progress');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

/**
 * @route DELETE /upload/:uploadId
 * @desc Cancel upload
 * @access Public
 * @param {string} uploadId - Upload identifier
 */
router.delete('/:uploadId', (req, res) => {
  try {
    const { uploadId } = req.params;
    const cancelled = fileUploadService.cancelUpload(uploadId);

    if (!cancelled) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Upload not found or already completed',
      });
    }

    res.json({
      success: true,
      message: 'Upload cancelled successfully',
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'cancel upload');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

/**
 * @route GET /upload/stats
 * @desc Get upload statistics
 * @access Public
 */
router.get('/stats', (req, res) => {
  try {
    const stats = fileUploadService.getUploadStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'get upload statistics');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

/**
 * @route POST /upload/cleanup
 * @desc Clean up old uploads
 * @access Public
 * @param {number} maxAge - Maximum age in milliseconds (optional)
 */
router.post('/cleanup', (req, res) => {
  try {
    const { maxAge } = req.body || {};
    fileUploadService.cleanup(maxAge);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
    });
  } catch (error) {
    const errorResponse = handleUploadError(error, 'cleanup uploads');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

/**
 * @route GET /health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = await fileUploadService.healthCheck();

    const statusCode = health.status === 'healthy'
      ? HTTP_STATUS.OK
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Get appropriate HTTP status code for error
 * @param {Error} error - Error object
 * @returns {number} - HTTP status code
 */
function getStatusCode(error) {
  if (error.code) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return HTTP_STATUS.BAD_REQUEST;
      case 'SECURITY_ERROR':
        return HTTP_STATUS.FORBIDDEN;
      case 'STORAGE_ERROR':
        return HTTP_STATUS.INTERNAL_SERVER_ERROR;
      case 'PROCESSING_ERROR':
        return HTTP_STATUS.INTERNAL_SERVER_ERROR;
      default:
        return HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
  }
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

// Apply multer error handling middleware
router.use(handleMulterError);

module.exports = router;