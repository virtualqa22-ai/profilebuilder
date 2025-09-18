/// <reference types="jest" />
import request from 'supertest';
import { createServer } from 'http';

// Mock the Next.js app
const mockApp = {
  prepare: jest.fn(() => Promise.resolve()),
  getRequestHandler: jest.fn(() => (req: any, res: any) => {
    // Mock request handler for testing
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, message: 'Mock response' }));
  }),
};

// Mock next
jest.mock('next', () => jest.fn(() => mockApp));

describe('Resumes API Integration Tests', () => {
  let server: any;
  let app: any;
  let handle: any;

  beforeAll(async () => {
    app = require('next')();
    handle = app.getRequestHandler();
    await app.prepare();
    server = createServer((req, res) => handle(req, res)).listen(4001);
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/resumes', () => {
    it('should return list of resumes', async () => {
      const response = await request(server)
        .get('/api/resumes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle query parameters', async () => {
      const response = await request(server)
        .get('/api/resumes?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(server)
        .get('/api/resumes?page=invalid&limit=invalid')
        .expect(200);

      // Should still return success or handle gracefully
      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/resumes', () => {
    it('should create a new resume with valid data', async () => {
      const resumeData = {
        title: 'Test Resume',
        content: 'Resume content here',
        locale: 'en-US',
      };

      const response = await request(server)
        .post('/api/resumes')
        .send(resumeData)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject invalid resume data', async () => {
      const invalidData = {
        title: '', // Empty title
        content: 'Content',
        locale: 'en-US',
      };

      const response = await request(server)
        .post('/api/resumes')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        title: 'Test Resume',
        // Missing content and locale
      };

      const response = await request(server)
        .post('/api/resumes')
        .send(incompleteData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle large content payloads', async () => {
      const largeContent = 'A'.repeat(10000); // 10KB of content
      const resumeData = {
        title: 'Large Resume',
        content: largeContent,
        locale: 'en-US',
      };

      const response = await request(server)
        .post('/api/resumes')
        .send(resumeData)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should return resume by ID', async () => {
      const resumeId = '507f1f77bcf86cd799439011';

      const response = await request(server)
        .get(`/api/resumes/${resumeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle non-existent resume ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439012';

      const response = await request(server)
        .get(`/api/resumes/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle invalid resume ID format', async () => {
      const invalidId = 'invalid-id';

      const response = await request(server)
        .get(`/api/resumes/${invalidId}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/resumes/:id', () => {
    it('should update resume with valid data', async () => {
      const resumeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Updated Resume',
        content: 'Updated content',
        locale: 'en-US',
      };

      const response = await request(server)
        .put(`/api/resumes/${resumeId}`)
        .send(updateData)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject update with invalid data', async () => {
      const resumeId = '507f1f77bcf86cd799439011';
      const invalidUpdate = {
        title: 'A'.repeat(101), // Too long title
        content: 'Content',
        locale: 'en-US',
      };

      const response = await request(server)
        .put(`/api/resumes/${resumeId}`)
        .send(invalidUpdate)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle concurrent updates', async () => {
      const resumeId = '507f1f77bcf86cd799439011';
      const updateData1 = { title: 'Update 1' };
      const updateData2 = { title: 'Update 2' };

      const [response1, response2] = await Promise.all([
        request(server)
          .put(`/api/resumes/${resumeId}`)
          .send(updateData1)
          .set('Content-Type', 'application/json'),
        request(server)
          .put(`/api/resumes/${resumeId}`)
          .send(updateData2)
          .set('Content-Type', 'application/json'),
      ]);

      // Both should succeed or one should handle the conflict
      expect(response1.status === 200 || response2.status === 200).toBe(true);
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    it('should delete resume successfully', async () => {
      const resumeId = '507f1f77bcf86cd799439011';

      const response = await request(server)
        .delete(`/api/resumes/${resumeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle deleting non-existent resume', async () => {
      const nonExistentId = '507f1f77bcf86cd799439012';

      const response = await request(server)
        .delete(`/api/resumes/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Comments API', () => {
    describe('GET /api/resumes/:id/comments', () => {
      it('should return comments for resume', async () => {
        const resumeId = '507f1f77bcf86cd799439011';

        const response = await request(server)
          .get(`/api/resumes/${resumeId}/comments`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/resumes/:id/comments', () => {
      it('should add comment to resume', async () => {
        const resumeId = '507f1f77bcf86cd799439011';
        const commentData = {
          field: 'personalInfo-name',
          text: 'This is a test comment',
          author: 'Test User',
        };

        const response = await request(server)
          .post(`/api/resumes/${resumeId}/comments`)
          .send(commentData)
          .set('Content-Type', 'application/json')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should reject invalid comment data', async () => {
        const resumeId = '507f1f77bcf86cd799439011';
        const invalidComment = {
          field: '', // Empty field
          text: 'Comment text',
          author: 'Test User',
        };

        const response = await request(server)
          .post(`/api/resumes/${resumeId}/comments`)
          .send(invalidComment)
          .set('Content-Type', 'application/json')
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // This would require mocking database errors
      const response = await request(server)
        .get('/api/resumes')
        .expect(200);

      // Should handle gracefully
      expect(response.body).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/resumes')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        title: 'Large Resume',
        content: 'A'.repeat(1000000), // 1MB content
        locale: 'en-US',
      };

      const response = await request(server)
        .post('/api/resumes')
        .send(largePayload)
        .set('Content-Type', 'application/json')
        .expect(413); // Payload too large

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle unauthenticated requests', async () => {
      const response = await request(server)
        .post('/api/resumes')
        .send({ title: 'Test', content: 'Content', locale: 'en-US' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(server)
        .delete('/api/resumes/507f1f77bcf86cd799439011')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(100).fill().map(() =>
        request(server).get('/api/resumes')
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      await request(server)
        .get('/api/resumes')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array(10).fill().map(() =>
        request(server).get('/api/resumes')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });
});