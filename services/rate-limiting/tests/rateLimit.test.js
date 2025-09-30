// Unit tests for rate limit model

const { RateLimit, validateRateLimitParams } = require('../src/models/RateLimit');

describe('RateLimit Model', () => {
  test('should validate valid parameters', () => {
    expect(validateRateLimitParams('user123', '/api/test')).toBe(true);
  });

  test('should reject invalid userId', () => {
    expect(validateRateLimitParams('', '/api/test')).toBe(false);
    expect(validateRateLimitParams('a'.repeat(101), '/api/test')).toBe(false);
  });

  test('should reject invalid endpoint', () => {
    expect(validateRateLimitParams('user123', '')).toBe(false);
    expect(validateRateLimitParams('user123', 'a'.repeat(501))).toBe(false);
  });

  test('should create RateLimit instance', () => {
    const rateLimit = new RateLimit('user123', '/api/test');
    expect(rateLimit.userId).toBe('user123');
    expect(rateLimit.endpoint).toBe('/api/test');
    expect(rateLimit.windowMs).toBe(60000);
    expect(rateLimit.maxRequests).toBe(1000);
  });

  test('should generate correct Redis key', () => {
    const rateLimit = new RateLimit('user123', '/api/test');
    expect(rateLimit.getKey()).toBe('rate_limit:user123:/api/test');
  });

  describe('RateLimit Operations with Mock Redis', () => {
    let mockRedisClient;

    beforeEach(() => {
      // Mock Redis client
      mockRedisClient = {
        zremrangebyscore: jest.fn().mockResolvedValue(0),
        zcard: jest.fn().mockResolvedValue(0),
        zadd: jest.fn().mockResolvedValue(1),
        pexpire: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
      };
    });

    test('should allow request when under limit', async () => {
      mockRedisClient.zcard.mockResolvedValue(5); // 5 requests in window
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const result = await rateLimit.isAllowed(mockRedisClient);

      expect(result).toBe(true);
      expect(mockRedisClient.zremrangebyscore).toHaveBeenCalled();
      expect(mockRedisClient.zcard).toHaveBeenCalledWith('rate_limit:user123:/api/test');
      expect(mockRedisClient.zadd).toHaveBeenCalled();
      expect(mockRedisClient.pexpire).toHaveBeenCalledWith('rate_limit:user123:/api/test', 60000);
    });

    test('should deny request when at limit', async () => {
      mockRedisClient.zcard.mockResolvedValue(10); // At limit
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const result = await rateLimit.isAllowed(mockRedisClient);

      expect(result).toBe(false);
      expect(mockRedisClient.zremrangebyscore).toHaveBeenCalled();
      expect(mockRedisClient.zcard).toHaveBeenCalled();
      expect(mockRedisClient.zadd).not.toHaveBeenCalled();
      expect(mockRedisClient.pexpire).not.toHaveBeenCalled();
    });

    test('should deny request when over limit', async () => {
      mockRedisClient.zcard.mockResolvedValue(15); // Over limit
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const result = await rateLimit.isAllowed(mockRedisClient);

      expect(result).toBe(false);
    });

    test('should throw error on Redis failure in isAllowed', async () => {
      mockRedisClient.zremrangebyscore.mockRejectedValue(new Error('Redis error'));
      const rateLimit = new RateLimit('user123', '/api/test');

      await expect(rateLimit.isAllowed(mockRedisClient)).rejects.toThrow('Redis error');
    });

    test('should get quota information', async () => {
      mockRedisClient.zcard.mockResolvedValue(3);
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const quota = await rateLimit.getQuota(mockRedisClient);

      expect(quota).toEqual({
        userId: 'user123',
        endpoint: '/api/test',
        requests: 3,
        limit: 10,
        windowMs: 60000,
        remaining: 7,
      });
      expect(mockRedisClient.zremrangebyscore).toHaveBeenCalled();
      expect(mockRedisClient.zcard).toHaveBeenCalled();
    });

    test('should handle zero remaining requests', async () => {
      mockRedisClient.zcard.mockResolvedValue(10);
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const quota = await rateLimit.getQuota(mockRedisClient);

      expect(quota.remaining).toBe(0);
    });

    test('should handle negative remaining (should not happen but defensive)', async () => {
      mockRedisClient.zcard.mockResolvedValue(15);
      const rateLimit = new RateLimit('user123', '/api/test', 60000, 10);

      const quota = await rateLimit.getQuota(mockRedisClient);

      expect(quota.remaining).toBe(0); // Math.max(0, ...)
    });

    test('should throw error on Redis failure in getQuota', async () => {
      mockRedisClient.zremrangebyscore.mockRejectedValue(new Error('Redis error'));
      const rateLimit = new RateLimit('user123', '/api/test');

      await expect(rateLimit.getQuota(mockRedisClient)).rejects.toThrow('Redis error');
    });

    test('should reset rate limit bucket', async () => {
      const rateLimit = new RateLimit('user123', '/api/test');

      await rateLimit.reset(mockRedisClient);

      expect(mockRedisClient.del).toHaveBeenCalledWith('rate_limit:user123:/api/test');
    });

    test('should throw error on Redis failure in reset', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      const rateLimit = new RateLimit('user123', '/api/test');

      await expect(rateLimit.reset(mockRedisClient)).rejects.toThrow('Redis error');
    });
  });

  describe('createRateLimit function', () => {
    test('should create RateLimit instance with provided parameters', () => {
      const { createRateLimit } = require('../src/models/RateLimit');
      const rateLimit = createRateLimit('user123', '/api/test', 30000, 5);

      expect(rateLimit.userId).toBe('user123');
      expect(rateLimit.endpoint).toBe('/api/test');
      expect(rateLimit.windowMs).toBe(30000);
      expect(rateLimit.maxRequests).toBe(5);
    });

    test('should create RateLimit instance with default parameters', () => {
      const { createRateLimit } = require('../src/models/RateLimit');
      const rateLimit = createRateLimit('user123', '/api/test');

      expect(rateLimit.userId).toBe('user123');
      expect(rateLimit.endpoint).toBe('/api/test');
      expect(rateLimit.windowMs).toBe(60000);
      expect(rateLimit.maxRequests).toBe(1000);
    });
  });
});