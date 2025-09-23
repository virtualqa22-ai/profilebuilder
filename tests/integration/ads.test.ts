/**
 * Ads API Integration Tests
 *
 * Tests the complete ads API functionality including:
 * - Metrics API with database persistence, validation, and rate limiting
 * - Config API with environment variable handling
 * - Security headers and error handling
 * - Privacy features like user ID anonymization
 */

import request from 'supertest';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { POST as postMetrics, GET as getMetrics } from '../../api/ads/metrics/route';
import { GET as getConfig } from '../../api/ads/config/route';
import AdMetric from '../../backend/models/AdMetric';
import { TestUtils, TestDataFactory } from './setup/test-setup.test';

describe('Ads API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Create test server with Next.js-like request handling
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const requestObj = new Request(url.toString(), {
            method: req.method,
            headers: req.headers,
          });

          let response;
          if (req.method === 'GET' && url.pathname === '/api/ads/config') {
            response = await getConfig(requestObj);
          } else if (req.method === 'POST' && url.pathname === '/api/ads/metrics') {
            // Read body for POST requests
            let body = '';
            req.on('data', chunk => body += chunk);
            await new Promise(resolve => req.on('end', resolve));
            const jsonBody = body ? JSON.parse(body) : {};
            requestObj.json = () => Promise.resolve(jsonBody);
            response = await postMetrics(requestObj);
          } else if (req.method === 'GET' && url.pathname === '/api/ads/metrics') {
            response = await getMetrics(requestObj);
          }

          // Convert NextResponse to HTTP response
          const responseBody = await response.json();

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');

          // Copy headers from NextResponse
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.end(JSON.stringify(responseBody));
        } catch (error) {
          console.error('Request handler error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }),
    };

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4005, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/ads/metrics - Track Ad Metrics', () => {
    it('should successfully track valid ad metric', async () => {
      const metricData = {
        user_id: 'test-user-123',
        ad_id: 'test-ad-456',
        event_type: 'impression',
        metadata: { size: 'banner', page: 'home' },
      };

      const response = await request(server)
        .post('/api/ads/metrics')
        .send(metricData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.message).toBe('Metric tracked successfully');

      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);

      // Verify data was saved to database
      const savedMetric = await AdMetric.findOne({
        adId: 'test-ad-456',
        eventType: 'impression',
      });
      expect(savedMetric).toBeTruthy();
      expect(savedMetric?.hashedUserId).toBeDefined();
      expect(savedMetric?.metadata.size).toBe('banner');
    });

    it('should anonymize user ID using SHA-256', async () => {
      const metricData = {
        user_id: 'test-user-123',
        ad_id: 'test-ad-456',
        event_type: 'click',
        metadata: {},
      };

      await request(server)
        .post('/api/ads/metrics')
        .send(metricData)
        .set('Content-Type', 'application/json')
        .expect(200);

      const savedMetric = await AdMetric.findOne({
        adId: 'test-ad-456',
        eventType: 'click',
      });

      // User ID should be hashed, not stored as plain text
      expect(savedMetric?.hashedUserId).not.toBe('test-user-123');
      expect(savedMetric?.hashedUserId).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });

    it('should handle all valid event types', async () => {
      const eventTypes = ['impression', 'click', 'view', 'hover', 'close'];

      for (const eventType of eventTypes) {
        const metricData = {
          user_id: 'test-user-123',
          ad_id: `test-ad-${eventType}`,
          event_type: eventType,
          metadata: { test: true },
        };

        const response = await request(server)
          .post('/api/ads/metrics')
          .send(metricData)
          .set('Content-Type', 'application/json')
          .expect(200);

        TestUtils.assertSuccessResponse(response);

        // Verify in database
        const savedMetric = await AdMetric.findOne({
          adId: `test-ad-${eventType}`,
          eventType,
        });
        expect(savedMetric).toBeTruthy();
      }
    });

    it('should reject invalid event types', async () => {
      const invalidData = {
        user_id: 'test-user-123',
        ad_id: 'test-ad-456',
        event_type: 'invalid-event',
        metadata: {},
      };

      const response = await request(server)
        .post('/api/ads/metrics')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        user_id: 'test-user-123',
        // Missing ad_id and event_type
        metadata: {},
      };

      const response = await request(server)
        .post('/api/ads/metrics')
        .send(incompleteData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle large metadata objects', async () => {
      const largeMetadata = {
        page: 'home',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenSize: { width: 1920, height: 1080 },
        additionalData: 'A'.repeat(1000), // Large string
      };

      const metricData = {
        user_id: 'test-user-123',
        ad_id: 'test-ad-large',
        event_type: 'impression',
        metadata: largeMetadata,
      };

      const response = await request(server)
        .post('/api/ads/metrics')
        .send(metricData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      // Verify large metadata was stored
      const savedMetric = await AdMetric.findOne({
        adId: 'test-ad-large',
      });
      expect(savedMetric?.metadata.additionalData).toBe('A'.repeat(1000));
    });

    it('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/ads/metrics')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400);
    });

    it('should implement rate limiting', async () => {
      const metricData = {
        user_id: 'rate-limit-test-user',
        ad_id: 'test-ad-rate-limit',
        event_type: 'impression',
        metadata: {},
      };

      // Send requests up to the rate limit (100 per minute)
      const requests = Array.from({ length: 101 }, () =>
        request(server)
          .post('/api/ads/metrics')
          .send(metricData)
          .set('Content-Type', 'application/json')
      );

      const responses = await Promise.all(requests);

      // First 100 should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(100);

      // Last one should be rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse?.body.error).toContain('Rate limit exceeded');
    });

    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect from database
      await mongoose.connection.close();

      try {
        const metricData = {
          user_id: 'test-user-123',
          ad_id: 'test-ad-db-error',
          event_type: 'impression',
          metadata: {},
        };

        const response = await request(server)
          .post('/api/ads/metrics')
          .send(metricData)
          .set('Content-Type', 'application/json')
          .expect(500);

        TestUtils.assertErrorResponse(response, 500, 'DATABASE_ERROR');
      } finally {
        // Reconnect for other tests
        await mongoose.connect(process.env.MONGODB_URI!);
      }
    });

    it('should handle missing ANONYMIZATION_SALT gracefully', async () => {
      const originalSalt = process.env.ANONYMIZATION_SALT;
      delete process.env.ANONYMIZATION_SALT;

      try {
        const metricData = {
          user_id: 'test-user-123',
          ad_id: 'test-ad-no-salt',
          event_type: 'impression',
          metadata: {},
        };

        const response = await request(server)
          .post('/api/ads/metrics')
          .send(metricData)
          .set('Content-Type', 'application/json')
          .expect(500);

        TestUtils.assertErrorResponse(response, 500);
      } finally {
        process.env.ANONYMIZATION_SALT = originalSalt;
      }
    });
  });

  describe('GET /api/ads/metrics - Metrics Retrieval', () => {
    it('should reject GET requests for privacy', async () => {
      const response = await request(server)
        .get('/api/ads/metrics')
        .expect(405);

      expect(response.body.error).toBe('Method not allowed');
    });
  });

  describe('GET /api/ads/config - Ad Configuration', () => {
    it('should return ad configuration when ads are enabled', async () => {
      process.env.ADS_ENABLED = 'true';
      process.env.AD_PROVIDERS = 'google,amazon';
      process.env.MAX_ADS_PER_PAGE = '5';

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.adsEnabled).toBe(true);
      expect(response.body.data.adProviders).toEqual(['google', 'amazon']);
      expect(response.body.data.maxAdsPerPage).toBe(5);

      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);

      // Cleanup
      delete process.env.ADS_ENABLED;
      delete process.env.AD_PROVIDERS;
      delete process.env.MAX_ADS_PER_PAGE;
    });

    it('should return disabled config when ads are not enabled', async () => {
      process.env.ADS_ENABLED = 'false';

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.adsEnabled).toBe(false);
      expect(response.body.data.adProviders).toEqual([]);
      expect(response.body.data.maxAdsPerPage).toBe(0);

      delete process.env.ADS_ENABLED;
    });

    it('should use default values when env vars are not set', async () => {
      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.adsEnabled).toBe(false);
      expect(response.body.data.adProviders).toEqual([]);
      expect(response.body.data.maxAdsPerPage).toBe(3); // Default from code
    });

    it('should validate and cap maxAdsPerPage', async () => {
      process.env.MAX_ADS_PER_PAGE = '20'; // Above max of 10

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      expect(response.body.data.maxAdsPerPage).toBe(10); // Capped at 10

      delete process.env.MAX_ADS_PER_PAGE;
    });

    it('should handle invalid maxAdsPerPage values', async () => {
      process.env.MAX_ADS_PER_PAGE = 'invalid';

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      expect(response.body.data.maxAdsPerPage).toBe(3); // Falls back to default

      delete process.env.MAX_ADS_PER_PAGE;
    });

    it('should parse comma-separated ad providers', async () => {
      process.env.ADS_ENABLED = 'true';
      process.env.AD_PROVIDERS = 'google, amazon , facebook ';

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      expect(response.body.data.adProviders).toEqual(['google', 'amazon', 'facebook']);

      delete process.env.ADS_ENABLED;
      delete process.env.AD_PROVIDERS;
    });

    it('should handle configuration errors gracefully', async () => {
      // Mock process.env to throw error
      const originalEnv = process.env;
      process.env = new Proxy(originalEnv, {
        get: (target, prop) => {
          if (prop === 'ADS_ENABLED') {
            throw new Error('Environment error');
          }
          return target[prop as string];
        },
      });

      try {
        const response = await request(server)
          .get('/api/ads/config')
          .expect(200);

        // Should return safe defaults on error
        expect(response.body.data.adsEnabled).toBe(false);
        expect(response.body.data.adProviders).toEqual([]);
        expect(response.body.data.maxAdsPerPage).toBe(0);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Security and Privacy', () => {
    it('should include security headers in all responses', async () => {
      const response = await request(server)
        .post('/api/ads/metrics')
        .send({
          user_id: 'test-user-123',
          ad_id: 'test-ad-security',
          event_type: 'impression',
          metadata: {},
        })
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });

    it('should include correlation ID in all responses', async () => {
      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should not expose sensitive configuration data', async () => {
      process.env.ADS_ENABLED = 'true';
      process.env.SOME_SECRET = 'sensitive-data';

      const response = await request(server)
        .get('/api/ads/config')
        .expect(200);

      // Should not contain sensitive environment variables
      expect(response.body.data).not.toHaveProperty('SOME_SECRET');

      delete process.env.ADS_ENABLED;
      delete process.env.SOME_SECRET;
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent metric tracking requests', async () => {
      const metricData = {
        user_id: 'concurrent-test-user',
        ad_id: 'test-ad-concurrent',
        event_type: 'impression',
        metadata: { test: 'concurrent' },
      };

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(server)
          .post('/api/ads/metrics')
          .send(metricData)
          .set('Content-Type', 'application/json')
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const avgResponseTime = totalDuration / responses.length;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestUtils.assertSuccessResponse(response);
      });

      // Average response time should be reasonable under concurrent load
      expect(avgResponseTime).toBeLessThan(500); // Less than 500ms average
    });

    it('should handle large payloads efficiently', async () => {
      const largeMetadata = {
        largeData: 'A'.repeat(50000), // 50KB of data
        nestedObject: {
          level1: {
            level2: {
              data: 'B'.repeat(10000),
            },
          },
        },
      };

      const metricData = {
        user_id: 'large-payload-user',
        ad_id: 'test-ad-large-payload',
        event_type: 'impression',
        metadata: largeMetadata,
      };

      const startTime = Date.now();
      const response = await request(server)
        .post('/api/ads/metrics')
        .send(metricData)
        .set('Content-Type', 'application/json')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      TestUtils.assertSuccessResponse(response);
      expect(responseTime).toBeLessThan(2000); // Less than 2 seconds for large payload
    });
  });
});