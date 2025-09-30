/**
 * Rate Limiting Service
 *
 * Provides Redis-based rate limiting with sliding window algorithm.
 * Supports configurable quotas per endpoint with circuit breaker resilience.
 * Ensures GDPR compliance with configurable data retention policies.
 *
 * Features:
 * - Sliding window rate limiting with Redis persistence
 * - Configurable quotas per endpoint (ai-rewrite: 10/min, ai-suggestions: 5/min, ai-lint: 15/min)
 * - Circuit breaker pattern for Redis resilience
 * - Automatic cleanup with TTL-based expiration
 * - Comprehensive logging and monitoring
 * - GDPR compliance with data retention policies
 */

import { createClient, RedisClientType } from 'redis';
import { CircuitBreaker } from './circuitBreaker';
import { Logger } from './logger';
import { globalLogger } from './logger';

/**
 * Rate limiting service configuration interface
 */
interface RateLimitingServiceConfig {
  /** Default quota limit for endpoints without specific config */
  defaultQuotaLimit: number;
  /** Default window size in milliseconds */
  defaultWindowMs: number;
  /** Circuit breaker configuration for Redis operations */
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number;
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
  /** Data retention period in days for GDPR compliance */
  retentionDays: number;
}

/**
 * Default rate limiting service configuration
 */
const defaultConfig: RateLimitingServiceConfig = {
  defaultQuotaLimit: 10,
  defaultWindowMs: 60000, // 1 minute
  circuitBreakerConfig: {
    failureThreshold: 3, // Lower threshold for rate limiting operations
    recoveryTimeout: 30000, // 30 seconds recovery time
    maxRetries: 2,
    baseDelay: 1000, // 1 second base delay
    maxDelay: 5000, // 5 seconds max delay
  },
  retentionDays: parseInt(process.env.RATE_LIMIT_RETENTION_DAYS || '7', 10),
};

/**
 * Rate limit check result interface
 */
interface RateLimitResult {
  allowed: boolean;
  quotaRemaining: number;
  quotaLimit: number;
  resetTime: Date;
  retryAfter?: number; // Seconds to wait before retry
}

/**
 * Quota information interface
 */
interface QuotaInfo {
  quotaLimit: number;
  quotaRemaining: number;
  quotaUsed: number;
  resetTime: Date;
  lastRequest: Date;
}

/**
 * Rate Limiting Service class
 */
export class RateLimitingService {
  private config: RateLimitingServiceConfig;
  private circuitBreaker: CircuitBreaker;
  private logger: Logger;
  private redisClient: RedisClientType;
  private isInitialized = false;
  private redisConnected = false;

  /**
   * Creates a new rate limiting service instance
   * @param config Optional configuration overrides
   */
  constructor(config: Partial<RateLimitingServiceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreakerConfig);
    this.logger = globalLogger;

    // Set up Redis client
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
    this.redisClient = createClient({ url: redisUrl });

    // Connect to Redis
    this.redisClient.connect().then(() => {
      this.redisConnected = true;
      this.logger.info('Redis client connected for rate limiting service');
    }).catch((error) => {
      this.logger.error('Failed to connect to Redis', error as Error);
      this.redisConnected = false;
    });

    // Initialize default configurations for AI endpoints
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default rate limit configurations for AI endpoints
   */
  private async initializeDefaultConfigurations(): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        // Check if configurations already exist
        const existingConfigs = await this.redisClient.keys('ratelimit:config:*');
        if (existingConfigs.length > 0) {
          this.logger.info('Rate limit configurations already exist, skipping initialization');
          return;
        }

        // Default configurations for AI endpoints
        const defaultConfigs = [
          {
            endpoint: 'ai-rewrite',
            method: 'POST',
            quotaLimit: 10,
            windowMs: 60000,
            description: 'AI content rewriting endpoint - 10 requests per minute',
            priority: 10,
          },
          {
            endpoint: 'ai-suggestions',
            method: 'POST',
            quotaLimit: 5,
            windowMs: 60000,
            description: 'AI grammar and style suggestions - 5 requests per minute',
            priority: 10,
          },
          {
            endpoint: 'ai-lint',
            method: 'POST',
            quotaLimit: 15,
            windowMs: 60000,
            description: 'AI linting and code analysis - 15 requests per minute',
            priority: 10,
          },
        ];

        // Store each config in Redis hash
        for (const config of defaultConfigs) {
          const key = `ratelimit:config:${config.endpoint}:${config.method}`;
          await this.redisClient.hSet(key, {
            quotaLimit: config.quotaLimit.toString(),
            windowMs: config.windowMs.toString(),
            description: config.description,
            priority: config.priority.toString(),
            isActive: 'true',
          });
        }

        this.logger.info('Default rate limit configurations initialized successfully');
      });

      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize rate limit configurations', error as Error);
      throw error;
    }
  }

  /**
   * Check if a request is allowed for the given user and endpoint
   * @param userId User identifier (can be user ID or IP address)
   * @param endpoint API endpoint being accessed
   * @param method HTTP method (defaults to POST)
   * @returns Promise resolving to rate limit check result
   */
  async checkRateLimit(
    userId: string,
    endpoint: string,
    method: string = 'POST'
  ): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      return await this.circuitBreaker.execute(async () => {
        // Get configuration for this endpoint from Redis hash
        const configKey = `ratelimit:config:${endpoint}:${method}`;
        const config = await this.redisClient.hGetAll(configKey);

        const quotaLimit = config?.quotaLimit ? parseInt(config.quotaLimit, 10) : this.config.defaultQuotaLimit;
        const windowMs = config?.windowMs ? parseInt(config.windowMs, 10) : this.config.defaultWindowMs;

        // Calculate window boundaries
        const now = Date.now();
        const windowStart = now - windowMs;
        const resetTime = new Date(now + windowMs);

        // Bucket key for sorted set
        const bucketKey = `ratelimit:bucket:${userId}:${endpoint}`;

        // Remove old requests outside the window
        await this.redisClient.zRemRangeByScore(bucketKey, '-inf', windowStart.toString());

        // Get current request count
        const currentCount = await this.redisClient.zCard(bucketKey);

        // Check if request is allowed
        const allowed = currentCount < quotaLimit;

        if (allowed) {
          // Add current request timestamp to sorted set
          const requestId = `${now}-${Math.random()}`;
          await this.redisClient.zAdd(bucketKey, { score: now, value: requestId });

          // Set TTL for GDPR compliance (retention days in seconds)
          const ttlSeconds = this.config.retentionDays * 24 * 60 * 60;
          await this.redisClient.expire(bucketKey, ttlSeconds);

          this.logger.logPerformance('rate_limit_check', Date.now() - startTime, {
            userId,
            endpoint,
            allowed: true,
            quotaRemaining: quotaLimit - currentCount - 1,
          });
        } else {
          // Rate limit exceeded
          const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

          this.logger.warn('Rate limit exceeded', {
            userId,
            endpoint,
            quotaLimit,
            currentRequests: currentCount,
            retryAfter,
          });
        }

        return {
          allowed,
          quotaRemaining: Math.max(0, quotaLimit - currentCount - (allowed ? 1 : 0)),
          quotaLimit,
          resetTime,
          retryAfter: allowed ? undefined : Math.ceil((resetTime.getTime() - now) / 1000),
        };
      });
    } catch (error) {
      this.logger.error('Rate limit check failed', error as Error, {
        userId,
        endpoint,
        duration: Date.now() - startTime,
      });

      // Fallback: allow request but log the error
      return {
        allowed: true,
        quotaRemaining: this.config.defaultQuotaLimit,
        quotaLimit: this.config.defaultQuotaLimit,
        resetTime: new Date(Date.now() + this.config.defaultWindowMs),
      };
    }
  }

  /**
   * Get current quota information for a user and endpoint
   * @param userId User identifier
   * @param endpoint API endpoint
   * @param method HTTP method (defaults to POST)
   * @returns Promise resolving to quota information
   */
  async getQuotaInfo(
    userId: string,
    endpoint: string,
    method: string = 'POST'
  ): Promise<QuotaInfo | null> {
    try {
      return await this.circuitBreaker.execute(async () => {
        // Get configuration
        const configKey = `ratelimit:config:${endpoint}:${method}`;
        const config = await this.redisClient.hGetAll(configKey);

        const quotaLimit = config?.quotaLimit ? parseInt(config.quotaLimit, 10) : this.config.defaultQuotaLimit;
        const windowMs = config?.windowMs ? parseInt(config.windowMs, 10) : this.config.defaultWindowMs;

        // Bucket key
        const bucketKey = `ratelimit:bucket:${userId}:${endpoint}`;

        // Remove old requests
        const windowStart = Date.now() - windowMs;
        await this.redisClient.zRemRangeByScore(bucketKey, '-inf', windowStart.toString());

        // Get current count
        const currentCount = await this.redisClient.zCard(bucketKey);

        // Get last request timestamp
        const lastRequestScore = await this.redisClient.zRangeWithScores(bucketKey, -1, -1);
        const lastRequest = lastRequestScore.length > 0 ? new Date(lastRequestScore[0].score) : new Date();

        return {
          quotaLimit,
          quotaRemaining: Math.max(0, quotaLimit - currentCount),
          quotaUsed: currentCount,
          resetTime: new Date(Date.now() + windowMs),
          lastRequest,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get quota information', error as Error, {
        userId,
        endpoint,
      });
      return null;
    }
  }

  /**
   * Update rate limit configuration for an endpoint
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param updates Configuration updates
   * @returns Promise resolving to updated configuration
   */
  async updateConfiguration(
    endpoint: string,
    method: string,
    updates: Partial<{
      quotaLimit: number;
      windowMs: number;
      description: string;
      isActive: boolean;
      priority: number;
      burstLimit: number;
      cooldownMs: number;
    }>
  ): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const configKey = `ratelimit:config:${endpoint}:${method}`;

        // Convert updates to strings for Redis
        const redisUpdates: Record<string, string> = {};
        if (updates.quotaLimit !== undefined) redisUpdates.quotaLimit = updates.quotaLimit.toString();
        if (updates.windowMs !== undefined) redisUpdates.windowMs = updates.windowMs.toString();
        if (updates.description !== undefined) redisUpdates.description = updates.description;
        if (updates.isActive !== undefined) redisUpdates.isActive = updates.isActive.toString();
        if (updates.priority !== undefined) redisUpdates.priority = updates.priority.toString();
        if (updates.burstLimit !== undefined) redisUpdates.burstLimit = updates.burstLimit.toString();
        if (updates.cooldownMs !== undefined) redisUpdates.cooldownMs = updates.cooldownMs.toString();

        const result = await this.redisClient.hSet(configKey, redisUpdates);

        if (result > 0) {
          this.logger.info('Rate limit configuration updated', {
            endpoint,
            method,
            updates,
          });
          return true;
        }

        return false;
      });
    } catch (error) {
      this.logger.error('Failed to update rate limit configuration', error as Error, {
        endpoint,
        method,
        updates,
      });
      return false;
    }
  }

  /**
   * Clean up expired rate limit buckets
   * Note: Redis TTL handles automatic cleanup, so this is a no-op
   * @returns Promise resolving to number of deleted buckets (always 0)
   */
  async cleanupExpiredBuckets(): Promise<number> {
    // TTL handles cleanup automatically
    this.logger.info('Cleanup called - Redis TTL handles automatic expiration');
    return 0;
  }

  /**
   * Get service health status
   * @returns Health status information
   */
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      redisConnected: this.redisConnected,
      circuitBreakerState: this.circuitBreaker.getState(),
      circuitBreakerFailures: this.circuitBreaker.getFailureCount(),
    };
  }

  /**
   * Reset circuit breaker (for maintenance)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.logger.info('Rate limiting service circuit breaker reset');
  }
}

// Singleton instance
let rateLimitingServiceInstance: RateLimitingService | null = null;

/**
 * Get rate limiting service instance
 * @param config Optional configuration overrides
 * @returns RateLimitingService instance
 */
export function getRateLimitingService(config?: Partial<RateLimitingServiceConfig>): RateLimitingService {
  if (!rateLimitingServiceInstance) {
    rateLimitingServiceInstance = new RateLimitingService(config);
  }
  return rateLimitingServiceInstance;
}

export default RateLimitingService;