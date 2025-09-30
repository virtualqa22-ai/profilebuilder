/**
 * Rate Limiting Service Integration Tests
 *
 * Tests the complete rate limiting API endpoints including:
 * - Rate limit checking with Redis
 * - Quota retrieval
 * - Circuit breaker functionality
 * - Health checks and metrics
 * - Error handling and resilience
 */

import request from 'supertest';
import express from 'express';
import rateLimitRoutes from '../../../services/rate-limiting/src/routes/rateLimit';
import healthRoutes from '../../../services/rate-limiting/src/routes/health';
import metricsRoutes from '../../../services/rate-limiting/src/routes/metrics';

describe('Rate Limiting Service Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let mockRedisClient: any;

  beforeAll(async () => {
    // Mock Redis client
    mockRedisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock redis client on app locals
    app.locals.redisClient = mockRedisClient;

    // Add routes
    app.use('/api/v1/rate-limit', rateLimitRoutes);
    app.use('/health', healthRoutes);
    app.use('/metrics', metricsRoutes);

    // Start server
    server = app.listen(4004);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
  });

  describe('POST /api/v1/rate-limit/check - Rate Limit Check', () => {
    it('should allow request within rate limit', async () => {
      // Mock Redis to return count below limit
      mockRedisClient.get.mockResolvedValue('5'); // 5 requests made
      mockRedisClient.incr.mockResolvedValue(6); // Increment to 6

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(200);

      expect(response.body.allowed).toBe(true);
      expect(response.body.message).toBe('Request allowed');
    });

    it('should deny request exceeding rate limit', async () => {
      // Mock Redis to return count at limit
      mockRedisClient.get.mockResolvedValue('100'); // At limit
      mockRedisClient.incr.mockResolvedValue(101); // Would exceed

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(429);

      expect(response.body.allowed).toBe(false);
      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.message).toBe('Rate limit exceeded');
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({ userId: 'user123' }) // Missing endpoint
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should handle invalid parameters', async () => {
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: '',
          endpoint: '/api/test'
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should add correlation ID to requests', async () => {
      mockRedisClient.get.mockResolvedValue('1');

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should handle Redis connection errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(500);

      expect(response.body.error).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/v1/rate-limit/quota/:userId/:endpoint - Get Quota', () => {
    it('should return current quota information', async () => {
      // Mock Redis data
      mockRedisClient.get.mockImplementation((key: string) => {
        if (key.includes('count')) return '25';
        if (key.includes('reset')) return Date.now().toString();
        return null;
      });

      const response = await request(app)
        .get('/api/v1/rate-limit/quota/user123/%2Fapi%2Ftest') // URL encoded /api/test
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'user123');
      expect(response.body).toHaveProperty('endpoint', '/api/test');
      expect(response.body).toHaveProperty('currentCount');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('resetTime');
    });

    it('should handle non-existent quota', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/rate-limit/quota/user123/%2Fapi%2Ftest')
        .expect(200);

      expect(response.body.currentCount).toBe(0);
    });

    it('should handle invalid parameters', async () => {
      const response = await request(app)
        .get('/api/v1/rate-limit/quota//%2Fapi%2Ftest') // Empty userId
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /health - Health Check', () => {
    it('should return healthy status when Redis is connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('rate-limiting-service');
      expect(response.body.dependencies.redis.status).toBe('healthy');
      expect(response.body.dependencies.circuitBreaker.status).toBe('healthy');
    });

    it('should return unhealthy status when Redis is disconnected', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.dependencies.redis.status).toBe('unhealthy');
    });

    it('should include timestamp in health response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('GET /metrics - Prometheus Metrics', () => {
    it('should return Prometheus-compatible metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should include circuit breaker metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('circuit_breaker_state');
      expect(response.text).toContain('circuit_breaker_requests_total');
    });

    it('should include rate limiting metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('rate_limit_requests_total');
      expect(response.text).toContain('rate_limit_denied_total');
    });

    it('should handle metrics generation errors', async () => {
      // Mock a metrics error
      const originalGetPrometheusMetrics = require('../../../services/rate-limiting/src/utils/metrics').getPrometheusMetrics;
      require('../../../services/rate-limiting/src/utils/metrics').getPrometheusMetrics = jest.fn().mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const response = await request(app)
        .get('/metrics')
        .expect(500);

      expect(response.text).toBe('# Error generating metrics\n');

      // Restore original
      require('../../../services/rate-limiting/src/utils/metrics').getPrometheusMetrics = originalGetPrometheusMetrics;
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should handle circuit breaker open state', async () => {
      // Mock circuit breaker as open
      const { recordFailure } = require('../../../services/rate-limiting/src/utils/circuitBreaker');
      const { canExecute } = require('../../../services/rate-limiting/src/utils/circuitBreaker');

      // Force circuit breaker to open by recording failures
      for (let i = 0; i < 10; i++) {
        recordFailure();
      }

      // Now circuit breaker should be open
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(503);

      expect(response.body.error).toBe('CIRCUIT_BREAKER_OPEN');
    });

    it('should allow requests when circuit breaker is closed', async () => {
      mockRedisClient.get.mockResolvedValue('1');

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(200);

      expect(response.body.allowed).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent rate limit checks', async () => {
      mockRedisClient.get.mockResolvedValue('1');
      mockRedisClient.incr.mockResolvedValue(2);

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/rate-limit/check')
          .send({
            userId: 'user123',
            endpoint: '/api/test'
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Security and Validation', () => {
    it('should prevent NoSQL injection in userId', async () => {
      const maliciousUserId = { $ne: null };

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: maliciousUserId,
          endpoint: '/api/test'
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should validate endpoint format', async () => {
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: 'invalid-endpoint' // Should start with /
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should handle very long userId and endpoint', async () => {
      const longUserId = 'a'.repeat(1000);
      const longEndpoint = '/' + 'a'.repeat(1000);

      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .send({
          userId: longUserId,
          endpoint: longEndpoint
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/v1/rate-limit/check')
        .expect(400);

      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .put('/api/v1/rate-limit/check')
        .send({
          userId: 'user123',
          endpoint: '/api/test'
        })
        .expect(404);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency requests', async () => {
      mockRedisClient.get.mockResolvedValue('1');
      mockRedisClient.incr.mockResolvedValue(2);

      const startTime = Date.now();

      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .post('/api/v1/rate-limit/check')
          .send({
            userId: 'user123',
            endpoint: '/api/test'
          })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const avgResponseTime = duration / responses.length;

      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // Should handle 100 requests in reasonable time
      expect(avgResponseTime).toBeLessThan(50); // Less than 50ms average
    });
  });
});