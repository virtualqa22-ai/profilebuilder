// Performance monitoring utilities for Document Generation Service
// Provides metrics tracking, performance monitoring, and optimization helpers

const { info: logInfo } = require('./logger');

/**
 * Metrics tracker for document generation operations
 */
class MetricsTracker {
  constructor() {
    this.metrics = {
      totalGenerations: 0,
      averageGenerationTime: 0,
      generationTimes: [],
      errors: 0,
      successRate: 100,
    };
  }

  /**
   * Tracks a generation operation
   * @param {number} startTime - Start time of operation
   * @param {boolean} success - Whether operation was successful
   */
  trackGeneration(startTime, success) {
    this.metrics.totalGenerations++;
    const generationTime = Date.now() - startTime;

    this.metrics.generationTimes.push(generationTime);
    this.metrics.averageGenerationTime =
      this.metrics.generationTimes.reduce((a, b) => a + b, 0) / this.metrics.generationTimes.length;

    if (!success) {
      this.metrics.errors++;
    }

    this.metrics.successRate = ((this.metrics.totalGenerations - this.metrics.errors) / this.metrics.totalGenerations) * 100;

    return this.metrics;
  }

  /**
   * Gets current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Resets metrics
   */
  reset() {
    this.metrics = {
      totalGenerations: 0,
      averageGenerationTime: 0,
      generationTimes: [],
      errors: 0,
      successRate: 100,
    };
  }
}

// Global metrics instance
const metricsTracker = new MetricsTracker();

/**
 * Performance monitoring decorator
 * @param {Function} fn - Function to monitor
 * @param {string} operationName - Name of the operation
 * @returns {Function} Monitored function
 */
function withPerformanceMonitoring(fn, operationName = 'operation') {
  return async (...args) => {
    const startTime = Date.now();

    try {
      logInfo(`${operationName} started`, { operationName });

      const result = await fn(...args);

      const duration = Date.now() - startTime;
      logInfo(`${operationName} completed`, {
        operationName,
        duration,
        success: true,
      });

      // Track metrics
      metricsTracker.trackGeneration(startTime, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logInfo(`${operationName} failed`, {
        operationName,
        duration,
        success: false,
        error: error.message,
      });

      // Track metrics
      metricsTracker.trackGeneration(startTime, false);

      throw error;
    }
  };
}

/**
 * Measures execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: *, duration: number}>} Result and duration
 */
async function measureExecutionTime(fn) {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  return { result, duration };
}

/**
 * Memory usage monitor
 */
class MemoryMonitor {
  constructor() {
    this.baseline = this.getMemoryUsage();
  }

  /**
   * Gets current memory usage
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
    };
  }

  /**
   * Gets memory delta from baseline
   * @returns {Object} Memory delta
   */
  getMemoryDelta() {
    const current = this.getMemoryUsage();
    return {
      rss: current.rss - this.baseline.rss,
      heapTotal: current.heapTotal - this.baseline.heapTotal,
      heapUsed: current.heapUsed - this.baseline.heapUsed,
      external: current.external - this.baseline.external,
    };
  }

  /**
   * Resets baseline
   */
  resetBaseline() {
    this.baseline = this.getMemoryUsage();
  }
}

/**
 * Performance profiler for operations
 */
class PerformanceProfiler {
  constructor() {
    this.profiles = new Map();
  }

  /**
   * Starts profiling an operation
   * @param {string} operationId - Unique operation ID
   */
  startProfiling(operationId) {
    this.profiles.set(operationId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
    });
  }

  /**
   * Ends profiling and returns profile data
   * @param {string} operationId - Operation ID
   * @returns {Object} Profile data
   */
  endProfiling(operationId) {
    const profile = this.profiles.get(operationId);
    if (!profile) return null;

    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    const profileData = {
      duration: endTime - profile.startTime,
      memoryDelta: {
        rss: endMemory.rss - profile.startMemory.rss,
        heapUsed: endMemory.heapUsed - profile.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - profile.startMemory.heapTotal,
      },
    };

    this.profiles.delete(operationId);
    return profileData;
  }
}

// Global profiler instance
const profiler = new PerformanceProfiler();

module.exports = {
  MetricsTracker,
  metricsTracker,
  withPerformanceMonitoring,
  measureExecutionTime,
  MemoryMonitor,
  PerformanceProfiler,
  profiler,
};