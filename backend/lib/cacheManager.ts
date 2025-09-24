/**
 * Multi-level caching system for performance optimization
 * Supports in-memory and Redis caching with TTL management and monitoring
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

// Cache configuration from environment variables
const CACHE_CONFIG = {
  JD_PARSER_TTL: parseInt(process.env.CACHE_JD_PARSER_TTL || '3600'), // 1 hour default
  ATS_SCORING_TTL: parseInt(process.env.CACHE_ATS_SCORING_TTL || '1800'), // 30 minutes default
  ENABLE_JD_PARSER_CACHE: process.env.CACHE_JD_PARSER_ENABLED !== 'false',
  ENABLE_ATS_SCORING_CACHE: process.env.CACHE_ATS_SCORING_ENABLED !== 'false',
};

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };

  /**
   * Get value from memory cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      this.stats.errors++;
      console.error('Memory cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in memory cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const expiry = Date.now() + (ttlSeconds * 1000);
      this.cache.set(key, { data: value, expiry });
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Memory cache set error:', error);
    }
  }

  /**
   * Delete value from memory cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) this.stats.deletes++;
      return deleted;
    } catch (error) {
      this.stats.errors++;
      console.error('Memory cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all entries from memory cache
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
    } catch (error) {
      this.stats.errors++;
      console.error('Memory cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Redis cache implementation
class RedisCache {
  private client: RedisClientType;
  private isConnected = false;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Get value from Redis cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      this.stats.errors++;
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in Redis cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis cache set error:', error);
      throw error;
    }
  }

  /**
   * Delete value from Redis cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      if (result > 0) this.stats.deletes++;
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all entries from Redis cache
   */
  async clear(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.flushAll();
    } catch (error) {
      this.stats.errors++;
      console.error('Redis cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

// Main cache manager with multi-level caching
export class CacheManager {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache | null = null;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    redisUrl?: string;
    defaultTTL?: number;
    enableRedis?: boolean;
    cleanupIntervalMinutes?: number;
  } = {}) {
    this.memoryCache = new MemoryCache();
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default

    if (options.enableRedis !== false) {
      const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisCache = new RedisCache(redisUrl);
      this.connectRedis();
    }

    // Start cleanup interval for memory cache
    const cleanupMinutes = options.cleanupIntervalMinutes || 10;
    this.cleanupInterval = setInterval(() => {
      this.memoryCache.cleanup();
    }, cleanupMinutes * 60 * 1000);
  }

  /**
   * Connect to Redis
   */
  private async connectRedis(): Promise<void> {
    if (this.redisCache) {
      try {
        await this.redisCache.connect();
        console.log('Redis cache connected');
      } catch (error) {
        console.warn('Failed to connect to Redis, falling back to memory cache only:', error);
        this.redisCache = null;
      }
    }
  }

  /**
   * Get value from cache (memory first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    let value = await this.memoryCache.get<T>(key);
    if (value !== null) {
      return value;
    }

    // Try Redis cache if available
    if (this.redisCache) {
      value = await this.redisCache.get<T>(key);
      if (value !== null) {
        // Populate memory cache for faster future access
        await this.memoryCache.set(key, value, this.defaultTTL);
        return value;
      }
    }

    return null;
  }

  /**
   * Set value in cache (both memory and Redis)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTTL;

    // Set in memory cache
    await this.memoryCache.set(key, value, ttl);

    // Set in Redis cache if available
    if (this.redisCache) {
      try {
        await this.redisCache.set(key, value, ttl);
      } catch (error) {
        console.warn('Failed to set in Redis cache:', error);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    let deleted = await this.memoryCache.delete(key);

    if (this.redisCache) {
      try {
        const redisDeleted = await this.redisCache.delete(key);
        deleted = deleted || redisDeleted;
      } catch (error) {
        console.warn('Failed to delete from Redis cache:', error);
      }
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.memoryCache.clear();

    if (this.redisCache) {
      try {
        await this.redisCache.clear();
      } catch (error) {
        console.warn('Failed to clear Redis cache:', error);
      }
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // For memory cache, we need to iterate and delete matching keys
    // This is a simple implementation - in production, consider more efficient approaches
    console.log(`Invalidating cache pattern: ${pattern}`);

    // For Redis, we can use KEYS command (be careful in production)
    if (this.redisCache && this.redisCache.isRedisConnected()) {
      try {
        const keys = await this.redisCache['client'].keys(pattern);
        if (keys.length > 0) {
          await this.redisCache['client'].del(keys);
        }
      } catch (error) {
        console.warn('Failed to invalidate Redis pattern:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memory: CacheStats;
    redis: CacheStats | null;
  } {
    return {
      memory: this.memoryCache.getStats(),
      redis: this.redisCache ? this.redisCache.getStats() : null,
    };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    memory: boolean;
    redis: boolean;
  }> {
    const memoryHealthy = true; // Memory cache is always healthy

    let redisHealthy = false;
    if (this.redisCache) {
      redisHealthy = this.redisCache.isRedisConnected();
    }

    return {
      memory: memoryHealthy,
      redis: redisHealthy,
    };
  }

  /**
   * Gracefully shutdown cache manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.redisCache) {
      await this.redisCache.disconnect();
    }
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

/**
 * Get or create cache manager instance
 */
export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    const redisUrl = process.env.REDIS_URL;
    const enableRedis = process.env.CACHE_REDIS_ENABLED !== 'false';

    cacheManagerInstance = new CacheManager({
      redisUrl,
      enableRedis,
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300'),
    });
  }

  return cacheManagerInstance;
}

/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  locale: (locale: string) => `locale:${locale}`,
  userSession: (userId: string) => `user:session:${userId}`,
  resume: (id: string) => `resume:${id}`,
  resumeTemplate: (templateId: string) => `resume:template:${templateId}`,
  userData: (userId: string) => `user:data:${userId}`,
  /**
   * Generate hash-based cache key for JD parsing
   * Uses SHA-256 hash of the job description text for consistent caching
   */
  jdKeywords: (jdText: string) => {
    const hash = createHash('sha256').update(jdText.trim().toLowerCase()).digest('hex');
    return `jd:keywords:${hash}`;
  },
  /**
   * Generate hash-based cache key for ATS scoring
   * Combines hashes of resume and JD for unique scoring cache
   */
  atsScore: (resumeId: string, jdText: string) => {
    const resumeHash = createHash('sha256').update(resumeId).digest('hex').substring(0, 16);
    const jdHash = createHash('sha256').update(jdText.trim().toLowerCase()).digest('hex').substring(0, 16);
    return `ats:score:${resumeHash}:${jdHash}`;
  },
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  if (cacheManagerInstance) {
    await cacheManagerInstance.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (cacheManagerInstance) {
    await cacheManagerInstance.shutdown();
  }
  process.exit(0);
});