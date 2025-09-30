// Upload progress tracking utilities
// Provides real-time progress monitoring for file uploads

const { info: logInfo, debug: logDebug } = require('./logger');

/**
 * Upload Progress Tracker class
 * Tracks upload progress, status, and provides real-time updates
 */
class UploadProgressTracker {
  constructor() {
    this.uploads = new Map();
    this.listeners = new Map();
  }

  /**
   * Start tracking an upload
   * @param {string} uploadId - Unique upload identifier
   * @param {Object} file - File object being uploaded
   * @param {Object} metadata - Additional metadata
   */
  startUpload(uploadId, file, metadata = {}) {
    const upload = {
      id: uploadId,
      filename: file.originalname,
      size: file.size,
      uploaded: 0,
      progress: 0,
      status: 'uploading',
      startTime: Date.now(),
      endTime: null,
      speed: 0, // bytes per second
      estimatedTimeRemaining: null,
      metadata,
      chunks: [],
    };

    this.uploads.set(uploadId, upload);

    logInfo('Upload started', {
      uploadId,
      filename: file.originalname,
      size: file.size,
    });

    this.notifyListeners(uploadId, upload);
  }

  /**
   * Update upload progress
   * @param {string} uploadId - Upload identifier
   * @param {number} bytesUploaded - Bytes uploaded so far
   * @param {number} chunkSize - Size of current chunk (optional)
   */
  updateProgress(uploadId, bytesUploaded, chunkSize = 0) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    const previousUploaded = upload.uploaded;
    upload.uploaded = bytesUploaded;
    upload.progress = upload.size > 0 ? (bytesUploaded / upload.size) * 100 : 0;

    // Calculate speed and ETA
    const currentTime = Date.now();
    const elapsedTime = currentTime - upload.startTime;

    if (elapsedTime > 0) {
      upload.speed = (bytesUploaded / elapsedTime) * 1000; // bytes per second

      if (upload.speed > 0 && upload.size > bytesUploaded) {
        const remainingBytes = upload.size - bytesUploaded;
        upload.estimatedTimeRemaining = remainingBytes / upload.speed;
      }
    }

    // Track chunks for detailed progress
    if (chunkSize > 0) {
      upload.chunks.push({
        size: chunkSize,
        uploadedAt: currentTime,
      });
    }

    // Update status
    if (upload.progress >= 100) {
      upload.status = 'completed';
      upload.endTime = currentTime;
      upload.progress = 100;

      logInfo('Upload completed', {
        uploadId,
        filename: upload.filename,
        totalTime: elapsedTime,
        averageSpeed: upload.speed,
      });
    }

    debug: logDebug('Upload progress updated', {
      uploadId,
      progress: Math.round(upload.progress),
      uploaded: bytesUploaded,
      speed: Math.round(upload.speed),
      eta: upload.estimatedTimeRemaining ? Math.round(upload.estimatedTimeRemaining) : null,
    });

    this.notifyListeners(uploadId, upload);
  }

  /**
   * Mark upload as failed
   * @param {string} uploadId - Upload identifier
   * @param {string} error - Error message
   */
  failUpload(uploadId, error) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.status = 'failed';
    upload.error = error;
    upload.endTime = Date.now();

    logInfo('Upload failed', {
      uploadId,
      filename: upload.filename,
      error,
      progress: upload.progress,
    });

    this.notifyListeners(uploadId, upload);
  }

  /**
   * Cancel upload
   * @param {string} uploadId - Upload identifier
   */
  cancelUpload(uploadId) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.status = 'cancelled';
    upload.endTime = Date.now();

    logInfo('Upload cancelled', {
      uploadId,
      filename: upload.filename,
      progress: upload.progress,
    });

    this.notifyListeners(uploadId, upload);
  }

  /**
   * Get upload progress
   * @param {string} uploadId - Upload identifier
   * @returns {Object|null} - Upload progress data or null if not found
   */
  getProgress(uploadId) {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * Get all active uploads
   * @returns {Array} - Array of active upload objects
   */
  getActiveUploads() {
    return Array.from(this.uploads.values()).filter(
      upload => upload.status === 'uploading'
    );
  }

  /**
   * Get upload statistics
   * @returns {Object} - Upload statistics
   */
  getStatistics() {
    const allUploads = Array.from(this.uploads.values());
    const completed = allUploads.filter(u => u.status === 'completed');
    const failed = allUploads.filter(u => u.status === 'failed');
    const active = allUploads.filter(u => u.status === 'uploading');

    return {
      total: allUploads.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      totalBytesUploaded: completed.reduce((sum, u) => sum + u.size, 0),
      averageSpeed: completed.length > 0
        ? completed.reduce((sum, u) => sum + u.speed, 0) / completed.length
        : 0,
    };
  }

  /**
   * Add progress listener
   * @param {string} uploadId - Upload identifier
   * @param {Function} callback - Callback function for progress updates
   */
  addListener(uploadId, callback) {
    if (!this.listeners.has(uploadId)) {
      this.listeners.set(uploadId, []);
    }
    this.listeners.get(uploadId).push(callback);
  }

  /**
   * Remove progress listener
   * @param {string} uploadId - Upload identifier
   * @param {Function} callback - Callback function to remove
   */
  removeListener(uploadId, callback) {
    const listeners = this.listeners.get(uploadId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners of progress update
   * @param {string} uploadId - Upload identifier
   * @param {Object} upload - Upload data
   * @private
   */
  notifyListeners(uploadId, upload) {
    const listeners = this.listeners.get(uploadId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(upload);
        } catch (error) {
          logDebug('Progress listener error', { uploadId, error: error.message });
        }
      });
    }
  }

  /**
   * Clean up completed/failed uploads older than specified time
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();
    const toDelete = [];

    for (const [uploadId, upload] of this.uploads) {
      if (upload.endTime && (now - upload.endTime) > maxAge) {
        toDelete.push(uploadId);
      }
    }

    toDelete.forEach(uploadId => {
      this.uploads.delete(uploadId);
      this.listeners.delete(uploadId);
    });

    if (toDelete.length > 0) {
      logInfo('Cleaned up old uploads', { count: toDelete.length });
    }
  }

  /**
   * Clear all uploads and listeners
   */
  clear() {
    this.uploads.clear();
    this.listeners.clear();
  }
}

/**
 * Progress reporter for periodic updates
 */
class ProgressReporter {
  constructor(tracker, interval = 1000) {
    this.tracker = tracker;
    this.interval = interval;
    this.intervalId = null;
  }

  /**
   * Start periodic progress reporting
   * @param {Function} callback - Callback for progress reports
   */
  startReporting(callback) {
    this.intervalId = setInterval(() => {
      const stats = this.tracker.getStatistics();
      callback(stats);
    }, this.interval);
  }

  /**
   * Stop progress reporting
   */
  stopReporting() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Create singleton instance
const uploadProgressTracker = new UploadProgressTracker();

module.exports = {
  UploadProgressTracker,
  ProgressReporter,
  uploadProgressTracker,
};