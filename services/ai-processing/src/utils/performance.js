// Performance optimization utilities
// Provides caching, request queuing, and metrics tracking for optimal performance

const { CACHE_CONFIG } = require('./constants');
const { info: logInfo, debug: logDebug } = require('./logger');

/**
 * Request Queue class for managing concurrent requests
 * Implements queuing to prevent overwhelming external services
 */
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
    this.completed = 0;
    this.failed = 0;
  }

  /**
   * Add a request to the queue
   * @param {Function} request - The request function to execute
   * @returns {Promise} - Promise that resolves with the request result
   */
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queued requests
   * @private
   */
  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { request, resolve, reject } = this.queue.shift();

    try {
      const result = await request();
      this.completed++;
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
    };
  }
}

/**
 * Simple LRU Cache implementation
 * Provides caching with automatic cleanup of least recently used items
 */
class LRUCache {
  constructor(maxSize = CACHE_CONFIG.MAX_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      return this.cache.get(key);
    }
    return undefined;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.set(key, value);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
    } else {
      // Add new
      this.cache.set(key, value);
      this.accessOrder.push(key);

      // Evict if over limit
      if (this.cache.size > this.maxSize) {
        const lruKey = this.accessOrder.shift();
        this.cache.delete(lruKey);
      }
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   * @returns {number} - Number of items in cache
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * Get cached result or compute and cache it
 * @param {string} key - Cache key
 * @param {Function} computeFunction - Function to compute value if not cached
 * @param {LRUCache} cache - Cache instance to use
 * @returns {*} - Cached or computed result
 */
function getCached(key, computeFunction, cache = new LRUCache()) {
  if (cache.has(key)) {
    logDebug('Cache hit', { key });
    return cache.get(key);
  }

  logDebug('Cache miss, computing', { key });
  const result = computeFunction();
  cache.set(key, result);
  return result;
}

/**
 * Metrics tracker for performance monitoring
 * Tracks request counts, response times, and error rates
 */
class MetricsTracker {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      responseTimes: [],
      startTime: Date.now(),
    };
  }

  /**
   * Track a request with its response time and success status
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether the request was successful
   * @param {string} error - Error message if failed
   * @returns {Object} - Updated metrics
   */
  trackRequest(responseTime, success, error = null) {
    this.metrics.requestCount++;
    this.metrics.responseTimes.push(responseTime);

    // Keep only last 1000 response times for memory efficiency
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }

    // Calculate rolling average
    this.metrics.averageResponseTime =
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;

    if (!success) {
      this.metrics.errorCount++;
    }

    logDebug('Request tracked', {
      responseTime,
      success,
      error: error ? error.substring(0, 100) : null,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
    });

    return {
      responseTime,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get current metrics
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptime,
      errorRate: this.metrics.requestCount > 0 ? this.metrics.errorCount / this.metrics.requestCount : 0,
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      responseTimes: [],
      startTime: Date.now(),
    };
  }
}

/**
 * Performance monitor decorator
 * Wraps functions to track their performance
 * @param {Function} fn - Function to monitor
 * @param {string} name - Name for logging
 * @returns {Function} - Monitored function
 */
function withPerformanceMonitoring(fn, name) {
  const metrics = new MetricsTracker();

  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const responseTime = Date.now() - startTime;
      metrics.trackRequest(responseTime, true);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      metrics.trackRequest(responseTime, false, error.message);
      throw error;
    }
  };
}

// Create singleton instances
const requestQueue = new RequestQueue();
const lruCache = new LRUCache();
const metricsTracker = new MetricsTracker();

module.exports = {
  RequestQueue,
  LRUCache,
  MetricsTracker,
  getCached,
  withPerformanceMonitoring,
  requestQueue,
  lruCache,
  metricsTracker,
};