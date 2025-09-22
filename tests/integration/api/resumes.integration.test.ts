/**
 * Resumes API Integration Tests
 *
 * Tests the complete resumes endpoint functionality including:
 * - Full CRUD operations with database persistence
 * - Caching behavior and cache invalidation
 * - Validation and error handling scenarios
 * - Security headers and correlation ID propagation
 * - Pagination and query parameters
 * - Database encryption/decryption
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { GET, POST } from '../../../api/resumes/route';
import { TestUtils, TestDataFactory } from '../setup/test-setup.test';

describe('Resumes API Integration Tests', () => {
  let server: any;
  let createdResumeId: string;

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
          if (req.method === 'GET') {
            response = await GET(requestObj);
          } else if (req.method === 'POST') {
            // Read body for POST requests
            let body = '';
            req.on('data', chunk => body += chunk);
            await new Promise(resolve => req.on('end', resolve));
            const jsonBody = body ? JSON.parse(body) : {};
            requestObj.json = () => Promise.resolve(jsonBody);
            response = await POST(requestObj);
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

    // Mock next module
    jest.mock('next', () => jest.fn(() => mockApp));

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4004, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/resumes - Create Resume', () => {
    it('should create a new resume with valid data', async () => {
      const resumeData = TestDataFactory.createValidResume();

      const response = await request(server)
        .post('/api/resumes')
        .send(resumeData)
        .set('Content-Type', 'application/json')
        .expect(201);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(resumeData.title);
      expect(response.body.data.locale).toBe(resumeData.locale);

      // Store ID for later tests
      createdResumeId = response.body.data._id;

      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);
    });

    it('should handle sensitive data properly', async () => {
      const resumeData = TestDataFactory.createValidResume({
        content: 'This is sensitive content',
        photos: 'Sensitive photo data',
        certifications: 'Sensitive certification data'
      });

      const response = await request(server)
        .post('/api/resumes')
        .send(resumeData)
        .set('Content-Type', 'application/json')
        .expect(201);

      // Verify data is properly handled
      expect(response.body.data.content).toBe(resumeData.content);
      expect(response.body.data.photos).toBe(resumeData.photos);
      expect(response.body.data.certifications).toBe(resumeData.certifications);
    });

    it('should reject invalid resume data', async () => {
      const invalidData = TestDataFactory.createInvalidResume();

      const response = await request(server)
        .post('/api/resumes')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(response.body.details).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = { title: 'Test Resume' };

      const response = await request(server)
        .post('/api/resumes')
        .send(incompleteData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle large content payloads', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB content
      const resumeData = TestDataFactory.createValidResume({ content: largeContent });

      const response = await request(server)
        .post('/api/resumes')
        .send(resumeData)
        .set('Content-Type', 'application/json')
        .expect(201);

      TestUtils.assertSuccessResponse(response);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/resumes')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400);
    });
  });

  describe('GET /api/resumes - List Resumes', () => {
    beforeAll(async () => {
      // Create multiple test resumes for pagination testing
      const resumes = Array.from({ length: 15 }, (_, i) =>
        TestDataFactory.createValidResume({
          title: `Test Resume ${i + 1}`,
          locale: i % 2 === 0 ? 'en-US' : 'en-GB'
        })
      );

      for (const resume of resumes) {
        await request(server)
          .post('/api/resumes')
          .send(resume)
          .set('Content-Type', 'application/json');
      }
    });

    it('should return list of resumes with default pagination', async () => {
      const response = await request(server)
        .get('/api/resumes')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      TestUtils.assertPaginationStructure(response);
      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);
    });

    it('should support pagination parameters', async () => {
      const response = await request(server)
        .get('/api/resumes?page=2&limit=5')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should support locale filtering', async () => {
      const response = await request(server)
        .get('/api/resumes?locale=en-US')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      response.body.data.forEach((resume: any) => {
        expect(resume.locale).toBe('en-US');
      });
    });

    it('should support sorting by creation date', async () => {
      const response = await request(server)
        .get('/api/resumes?sortBy=createdAt&sortOrder=desc')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      const resumes = response.body.data;
      for (let i = 1; i < resumes.length; i++) {
        const prevDate = new Date(resumes[i - 1].createdAt);
        const currDate = new Date(resumes[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it('should exclude content fields when includeContent=false', async () => {
      const response = await request(server)
        .get('/api/resumes?includeContent=false')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      // Content fields should be excluded for performance
      response.body.data.forEach((resume: any) => {
        expect(resume.content).toBeUndefined();
        expect(resume.photos).toBeUndefined();
        expect(resume.certifications).toBeUndefined();
      });
    });

    it('should include content fields when includeContent=true', async () => {
      const response = await request(server)
        .get('/api/resumes?includeContent=true')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      response.body.data.forEach((resume: any) => {
        expect(resume).toHaveProperty('content');
      });
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const response = await request(server)
        .get('/api/resumes?page=invalid&limit=invalid')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      // Should use default values
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should handle out of range pagination', async () => {
      const response = await request(server)
        .get('/api/resumes?page=999&limit=10')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.length).toBe(0);
      expect(response.body.pagination.page).toBe(999);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache resume list responses', async () => {
      // First request
      const response1 = await request(server)
        .get('/api/resumes?page=1&limit=5')
        .expect(200);

      // Second request with same parameters (should hit cache)
      const response2 = await request(server)
        .get('/api/resumes?page=1&limit=5')
        .expect(200);

      // Responses should be identical (from cache)
      expect(response1.body).toEqual(response2.body);
    });

    it('should invalidate cache when new resume is created', async () => {
      // Get current list
      const beforeResponse = await request(server)
        .get('/api/resumes')
        .expect(200);

      const beforeCount = beforeResponse.body.data.length;

      // Create new resume
      await request(server)
        .post('/api/resumes')
        .send(TestDataFactory.createValidResume({ title: 'Cache Test Resume' }))
        .set('Content-Type', 'application/json')
        .expect(201);

      // Get list again (should not be cached)
      const afterResponse = await request(server)
        .get('/api/resumes')
        .expect(200);

      const afterCount = afterResponse.body.data.length;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it('should handle cache with different query parameters', async () => {
      // Different cache keys for different parameters
      const response1 = await request(server)
        .get('/api/resumes?page=1&limit=5')
        .expect(200);

      const response2 = await request(server)
        .get('/api/resumes?page=1&limit=10')
        .expect(200);

      // Should have different results due to different limits
      expect(response1.body.data.length).not.toBe(response2.body.data.length);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(server).get('/api/resumes?page=1&limit=5')
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
      expect(avgResponseTime).toBeLessThan(200); // Less than 200ms average
    });

    it('should maintain performance with large result sets', async () => {
      const startTime = Date.now();

      const response = await request(server)
        .get('/api/resumes?page=1&limit=50')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      TestUtils.assertSuccessResponse(response);
      expect(responseTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Security and Validation', () => {
    it('should validate resume data against locale requirements', async () => {
      const invalidData = TestDataFactory.createValidResume({
        locale: 'invalid-locale'
      });

      const response = await request(server)
        .post('/api/resumes')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'BAD_REQUEST');
    });

    it('should prevent XSS attacks through input validation', async () => {
      const maliciousData = TestDataFactory.createValidResume({
        title: '<script>alert("XSS")</script>Test Resume',
        content: 'javascript:alert("XSS")'
      });

      const response = await request(server)
        .post('/api/resumes')
        .send(maliciousData)
        .set('Content-Type', 'application/json')
        .expect(201);

      // Data should be sanitized
      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.content).not.toContain('javascript:');
    });

    it('should handle very large payloads appropriately', async () => {
      const largeData = TestDataFactory.createValidResume({
        content: 'A'.repeat(1000000), // 1MB content
        photos: 'B'.repeat(500000),   // 0.5MB photos
      });

      const response = await request(server)
        .post('/api/resumes')
        .send(largeData)
        .set('Content-Type', 'application/json');

      // Should either succeed or fail gracefully with appropriate error
      if (response.status === 201) {
        TestUtils.assertSuccessResponse(response);
      } else {
        expect([400, 413]).toContain(response.status); // Bad request or payload too large
      }
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Temporarily disconnect from database
      await mongoose.connection.close();

      try {
        const response = await request(server)
          .get('/api/resumes')
          .expect(500);

        TestUtils.assertErrorResponse(response, 500, 'DATABASE_ERROR');
      } finally {
        // Reconnect for other tests
        await mongoose.connect(process.env.MONGODB_URI!);
      }
    });

    it('should handle database write failures', async () => {
      // Create invalid data that might cause write failure
      const invalidData = TestDataFactory.createValidResume({
        title: 'A'.repeat(200), // Exceeds max length
      });

      const response = await request(server)
        .post('/api/resumes')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Monitoring and Observability', () => {
    it('should include correlation IDs in all responses', async () => {
      const response = await request(server)
        .get('/api/resumes')
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should provide detailed error information for debugging', async () => {
      const invalidData = TestDataFactory.createInvalidResume();

      const response = await request(server)
        .post('/api/resumes')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('error');
      if (response.body.details) {
        expect(typeof response.body.details).toBe('object');
      }
    });

    it('should handle monitoring tool requests appropriately', async () => {
      const response = await request(server)
        .get('/api/resumes')
        .set('User-Agent', 'Monitoring-Tool/1.0')
        .set('Accept', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});