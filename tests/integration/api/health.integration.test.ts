/**
 * Health API Integration Tests
 *
 * Tests the complete health check endpoint functionality including:
 * - Database connectivity verification
 * - System metrics collection
 * - Security headers application
 * - Correlation ID propagation
 * - Error handling scenarios
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { GET } from '../../../api/health/route';
import { TestUtils } from '../setup/test-setup.test';

describe('Health API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Create test server with Next.js-like request handling
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const request = new Request(url.toString(), {
            method: req.method,
            headers: req.headers,
          });

          // Call the actual health endpoint
          const response = await GET();

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
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }),
    };

    // Mock next module
    jest.mock('next', () => jest.fn(() => mockApp));

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4003, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/health - Healthy System', () => {
    it('should return healthy status when database is connected', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'profilebuilder');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('responseTime');

      // Verify checks object
      expect(response.body.checks).toHaveProperty('database', 'healthy');
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('used');
      expect(response.body.checks.memory).toHaveProperty('total');
      expect(response.body.checks.memory).toHaveProperty('unit', 'MB');

      // Verify timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);

      // Verify response time is reasonable
      expect(response.body.responseTime).toBeGreaterThan(0);
      expect(response.body.responseTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should apply security headers to health response', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });

    it('should include correlation ID in response headers', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should return valid uptime value', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return version information', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(typeof response.body.version).toBe('string');
      expect(response.body.version.length).toBeGreaterThan(0);
    });
  });

  describe('Database Connectivity Checks', () => {
    it('should verify database connection is working', async () => {
      // Ensure database is connected before test
      expect(mongoose.connection.readyState).toBe(1); // Connected

      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks.database).toBe('healthy');
    });

    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect from database
      await mongoose.connection.close();

      try {
        const response = await request(server)
          .get('/api/health')
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('code', 'DATABASE_ERROR');
      } finally {
        // Reconnect for other tests
        await mongoose.connect(process.env.MONGODB_URI!);
      }
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should report accurate memory usage statistics', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      const memory = response.body.checks.memory;

      expect(typeof memory.used).toBe('number');
      expect(typeof memory.total).toBe('number');
      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(0);
      expect(memory.used).toBeLessThanOrEqual(memory.total);
    });

    it('should report memory in MB units', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks.memory.unit).toBe('MB');
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure and report response time accurately', async () => {
      const startTime = Date.now();

      const response = await request(server)
        .get('/api/health')
        .expect(200);

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Response time should be close to actual duration (within 50ms tolerance)
      expect(response.body.responseTime).toBeGreaterThan(0);
      expect(Math.abs(response.body.responseTime - actualDuration)).toBeLessThan(50);
    });

    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server).get('/api/health')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.checks.database).toBe('healthy');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed requests gracefully', async () => {
      // This test is more relevant for POST endpoints, but included for completeness
      const response = await request(server)
        .get('/api/health?invalid=param')
        .expect(200);

      // Health endpoint should ignore invalid query parameters
      expect(response.body.status).toBe('healthy');
    });

    it('should handle very large request headers', async () => {
      const largeHeader = 'x'.repeat(10000);

      const response = await request(server)
        .get('/api/health')
        .set('x-large-header', largeHeader)
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Security and Headers', () => {
    it('should prevent XSS through response data', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Ensure no script tags or dangerous content in response
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/<script/i);
      expect(responseString).not.toMatch(/javascript:/i);
    });

    it('should set appropriate cache control headers', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Health endpoints typically shouldn't be cached
      expect(response.headers['cache-control']).toBeDefined();
    });

    it('should include content security policy', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Check for CSP header
      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should maintain performance under load', async () => {
      const requestCount = 20;
      const requests = Array.from({ length: requestCount }, () =>
        request(server).get('/api/health')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const avgResponseTime = totalDuration / requestCount;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(100); // Less than 100ms average
    });

    it('should handle rapid successive requests', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(server)
          .get('/api/health')
          .expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.checks.database).toBe('healthy');
      }
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide comprehensive health metrics', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Verify all expected metrics are present
      const requiredFields = [
        'status',
        'service',
        'timestamp',
        'uptime',
        'version',
        'checks',
        'responseTime'
      ];

      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });

      // Verify checks structure
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('memory');
    });

    it('should support health check monitoring tools', async () => {
      const response = await request(server)
        .get('/api/health')
        .set('User-Agent', 'Monitoring-Tool/1.0')
        .expect(200);

      // Should work with monitoring tools
      expect(response.body.status).toBe('healthy');
    });
  });
});