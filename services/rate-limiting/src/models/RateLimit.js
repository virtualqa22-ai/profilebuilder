// Rate limit data model and operations for the rate limiting microservice
// Handles rate limit bucket management, sliding window calculations, and Redis operations
// Implements sliding window rate limiting algorithm

const { REDIS_KEY_PREFIX, DEFAULT_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_MAX_REQUESTS } = require('../constants');

/**
 * RateLimit class representing a rate limit bucket for a user and endpoint
 */
class RateLimit {
  /**
   * Create a RateLimit instance
   * @param {string} userId - User identifier
   * @param {string} endpoint - API endpoint
   * @param {number} windowMs - Time window in milliseconds
   * @param {number} maxRequests - Maximum requests allowed in the window
   */
  constructor(userId, endpoint, windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS, maxRequests = DEFAULT_RATE_LIMIT_MAX_REQUESTS) {
    this.userId = userId;
    this.endpoint = endpoint;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.key = `${REDIS_KEY_PREFIX}${userId}:${endpoint}`;
  }

  /**
   * Get Redis key for this rate limit bucket
   * @returns {string} - Redis key
   */
  getKey() {
    return this.key;
  }

  /**
   * Check if request is allowed based on current rate limit state
   * @param {object} redisClient - Redis client instance
   * @returns {Promise<boolean>} - True if allowed, false if rate limited
   */
  async isAllowed(redisClient) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Use Redis sorted set to store timestamps of requests
      // Remove old entries outside the window
      await redisClient.zremrangebyscore(this.key, 0, windowStart);

      // Count current requests in window
      const currentCount = await redisClient.zcard(this.key);

      if (currentCount < this.maxRequests) {
        // Add current request timestamp
        await redisClient.zadd(this.key, now, now.toString());
        // Set expiration on the key (cleanup)
        await redisClient.pexpire(this.key, this.windowMs);
        return true;
      }

      return false;
    } catch (error) {
      // If Redis fails, circuit breaker should handle it
      throw error;
    }
  }

  /**
   * Get current quota information
   * @param {object} redisClient - Redis client instance
   * @returns {Promise<object>} - Quota information
   */
  async getQuota(redisClient) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Clean up old entries
      await redisClient.zremrangebyscore(this.key, 0, windowStart);

      // Get current count
      const currentCount = await redisClient.zcard(this.key);

      return {
        userId: this.userId,
        endpoint: this.endpoint,
        requests: currentCount,
        limit: this.maxRequests,
        windowMs: this.windowMs,
        remaining: Math.max(0, this.maxRequests - currentCount),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset rate limit bucket (for testing or admin purposes)
   * @param {object} redisClient - Redis client instance
   * @returns {Promise<void>}
   */
  async reset(redisClient) {
    try {
      await redisClient.del(this.key);
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Create a RateLimit instance from parameters
 * @param {string} userId - User identifier
 * @param {string} endpoint - API endpoint
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests allowed
 * @returns {RateLimit} - RateLimit instance
 */
function createRateLimit(userId, endpoint, windowMs, maxRequests) {
  return new RateLimit(userId, endpoint, windowMs, maxRequests);
}

/**
 * Validate rate limit parameters
 * @param {string} userId - User identifier
 * @param {string} endpoint - API endpoint
 * @returns {boolean} - True if valid
 */
function validateRateLimitParams(userId, endpoint) {
  const { VALIDATION_RULES } = require('../constants');

  if (!userId || typeof userId !== 'string' ||
      userId.length < VALIDATION_RULES.USER_ID_MIN_LENGTH ||
      userId.length > VALIDATION_RULES.USER_ID_MAX_LENGTH) {
    return false;
  }

  if (!endpoint || typeof endpoint !== 'string' ||
      endpoint.length < VALIDATION_RULES.ENDPOINT_MIN_LENGTH ||
      endpoint.length > VALIDATION_RULES.ENDPOINT_MAX_LENGTH) {
    return false;
  }

  return true;
}

// Export RateLimit class and utility functions
module.exports = {
  RateLimit,
  createRateLimit,
  validateRateLimitParams,
};