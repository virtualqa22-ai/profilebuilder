// Performance monitoring utilities for file upload service
// Provides metrics tracking, request queuing, and performance optimization

const { info: logInfo, debug: logDebug } = require('./logger');

/**
 * Upload Queue class for managing concurrent file uploads
 * Prevents overwhelming storage services and manages resource usage
 */
class UploadQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
    this.completed = 0;
    this.failed = 0;
    this.totalBytesUploaded = 0;
  }

  /**
   * Add an upload task to the queue
   * @param {Function} uploadTask - The upload function to execute
   * @param {number} fileSize - Size of file being uploaded
   * @returns {Promise} - Promise that resolves with the upload result
   */
  async add(uploadTask, fileSize = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ uploadTask, fileSize, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queued upload tasks
   * @private
   */
  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { uploadTask, fileSize, resolve, reject } = this.queue.shift();

    try {
      const result = await uploadTask();
      this.completed++;
      this.totalBytesUploaded += fileSize;
      resolve(result);
    } catch (error) {
      this.failed++;
      reject(error);
    } finally {
      this.running--;
      // Process next item in queue
      this.process();
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} - Queue stats
   */
  get stats() {
    return {
      maxConcurrent: this.maxConcurrent,
      running: this.running,
      queued: this.queue.length,
      completed: this.completed,
      failed: this.failed,
      totalProcessed: this.completed + this.failed,
      totalBytesUploaded: this.totalBytesUploaded,
      successRate: this.totalProcessed > 0 ? (this.completed / this.totalProcessed) * 100 : 0,
    };
  }
}

/**
 * Upload Metrics Tracker for performance monitoring
 * Tracks upload statistics, response times, and throughput
 */
class UploadMetricsTracker {
  constructor() {
    this.metrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalBytesUploaded: 0,
      averageUploadTime: 0,
      averageFileSize: 0,
      uploadTimes: [],
      fileSizes: [],
      startTime: Date.now(),
    };
  }

  /**
   * Track an upload operation
   * @param {number} uploadTime - Upload time in milliseconds
   * @param {number} fileSize - Size of uploaded file in bytes
   * @param {boolean} success - Whether the upload was successful
   * @param {string} error - Error message if failed
   */
  trackUpload(uploadTime, fileSize, success, error = null) {
    this.metrics.totalUploads++;
    this.metrics.totalBytesUploaded += fileSize;

    if (success) {
      this.metrics.successfulUploads++;
    } else {
      this.metrics.failedUploads++;
    }

    // Track upload times (keep last 1000 for memory efficiency)
    this.metrics.uploadTimes.push(uploadTime);
    if (this.metrics.uploadTimes.length > 1000) {
      this.metrics.uploadTimes = this.metrics.uploadTimes.slice(-1000);
    }

    // Track file sizes
    this.metrics.fileSizes.push(fileSize);
    if (this.metrics.fileSizes.length > 1000) {
      this.metrics.fileSizes = this.metrics.fileSizes.slice(-1000);
    }

    // Calculate averages
    this.metrics.averageUploadTime =
      this.metrics.uploadTimes.reduce((a, b) => a + b, 0) / this.metrics.uploadTimes.length;

    this.metrics.averageFileSize =
      this.metrics.fileSizes.reduce((a, b) => a + b, 0) / this.metrics.fileSizes.length;

    logDebug('Upload tracked', {
      uploadTime,
      fileSize,
      success,
      error: error ? error.substring(0, 100) : null,
      averageUploadTime: Math.round(this.metrics.averageUploadTime),
      averageFileSize: Math.round(this.metrics.averageFileSize),
    });
  }

  /**
   * Get current metrics
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const throughput = uptime > 0 ? (this.metrics.totalBytesUploaded / uptime) * 1000 : 0; // bytes per second

    return {
      ...this.metrics,
      uptime,
      successRate: this.metrics.totalUploads > 0 ? (this.metrics.successfulUploads / this.metrics.totalUploads) * 100 : 0,
      throughput: Math.round(throughput),
      averageUploadTime: Math.round(this.metrics.averageUploadTime),
      averageFileSize: Math.round(this.metrics.averageFileSize),
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalBytesUploaded: 0,
      averageUploadTime: 0,
      averageFileSize: 0,
      uploadTimes: [],
      fileSizes: [],
      startTime: Date.now(),
    };
  }
}

/**
 * Performance monitor decorator for upload operations
 * @param {Function} fn - Function to monitor
 * @param {string} operationName - Name for logging
 * @returns {Function} - Monitored function
 */
function withUploadPerformanceMonitoring(fn, operationName) {
  const metrics = new UploadMetricsTracker();

  return async (...args) => {
    const startTime = Date.now();
    const fileSize = args[0]?.size || 0; // Assume first arg has size property

    try {
      const result = await fn(...args);
      const uploadTime = Date.now() - startTime;
      metrics.trackUpload(uploadTime, fileSize, true);
      return result;
    } catch (error) {
      const uploadTime = Date.now() - startTime;
      metrics.trackUpload(uploadTime, fileSize, false, error.message);
      throw error;
    }
  };
}

/**
 * Memory usage monitor for upload operations
 * @returns {Object} - Memory usage statistics
 */
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
  };
}

/**
 * CPU usage monitor (basic)
 * @returns {Object} - CPU usage statistics
 */
function getCpuUsage() {
  const cpus = require('os').cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    usage: Math.round(((totalTick - totalIdle) / totalTick) * 100),
    cores: cpus.length,
  };
}

// Create singleton instances
const uploadQueue = new UploadQueue();
const uploadMetricsTracker = new UploadMetricsTracker();

module.exports = {
  UploadQueue,
  UploadMetricsTracker,
  withUploadPerformanceMonitoring,
  getMemoryUsage,
  getCpuUsage,
  uploadQueue,
  uploadMetricsTracker,
};