/**
 * AI Rewrite API Integration Tests
 *
 * Tests the complete AI rewrite endpoint functionality including:
 * - Request validation and sanitization
 * - AI service integration
 * - Error handling and user feedback
 * - Security headers and rate limiting
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import { POST } from '../../../api/v1/ai/rewrite/route';
import { TestUtils } from '../setup/test-setup.test';

// Mock the AI service
jest.mock('../../../backend/lib/aiService', () => ({
  getAIService: jest.fn(() => ({
    rewriteContent: jest.fn(),
  })),
}));

// Mock security headers
jest.mock('../../../backend/lib/errorHandler', () => ({
  applySecurityHeaders: jest.fn((response) => response),
}));

describe('AI Rewrite API Integration Tests', () => {
  let server: any;
  let mockAIService: any;
  let mockRewriteContent: any;

  beforeAll(async () => {
    // Get mock instances
    mockAIService = require('../../../backend/lib/aiService').getAIService();
    mockRewriteContent = mockAIService.rewriteContent;

    // Create test server
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling for POST
          if (req.method === 'POST' && req.url === '/api/v1/ai/rewrite') {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const request = new Request(url.toString(), {
              method: req.method,
              headers: req.headers,
              body: req.body ? JSON.stringify(req.body) : undefined,
            });

            const response = await POST(request);

            // Convert NextResponse to HTTP response
            const responseBody = await response.json();

            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');

            // Copy headers from NextResponse
            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });

            res.end(JSON.stringify(responseBody));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
          }
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }),
    };

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4004, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRewriteContent.mockResolvedValue('Rewritten content here');
  });

  describe('POST /api/v1/ai/rewrite - Successful Requests', () => {
    it('should successfully rewrite content without style', async () => {
      const requestBody = {
        content: 'This is some content to rewrite professionally.',
      };

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data', 'Rewritten content here');
      expect(mockRewriteContent).toHaveBeenCalledWith('This is some content to rewrite professionally.', undefined, undefined);
    });

    it('should successfully rewrite content with style parameter', async () => {
      const requestBody = {
        content: 'Make this sound more formal.',
        style: 'professional',
        userId: 'user123',
      };

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe('Rewritten content here');
      expect(mockRewriteContent).toHaveBeenCalledWith('Make this sound more formal.', 'professional', 'user123');
    });

    it('should handle optional userId parameter', async () => {
      const requestBody = {
        content: 'Test content',
        userId: 'anonymous-user',
      };

      await request(server)
        .post('/api/v1/ai/rewrite')
        .send(requestBody)
        .expect(200);

      expect(mockRewriteContent).toHaveBeenCalledWith('Test content', undefined, 'anonymous-user');
    });

    it('should apply security headers to successful responses', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });
  });

  describe('Request Validation', () => {
    it('should reject requests without content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required');
      expect(mockRewriteContent).not.toHaveBeenCalled();
    });

    it('should reject requests with non-string content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with empty content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required');
    });

    it('should reject content exceeding maximum length', async () => {
      const longContent = 'a'.repeat(10001);

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: longContent })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content exceeds maximum length');
      expect(mockRewriteContent).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid style type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test', style: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Style must be a string');
    });

    it('should accept content at maximum allowed length', async () => {
      const maxContent = 'a'.repeat(10000);

      await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: maxContent })
        .expect(200);

      expect(mockRewriteContent).toHaveBeenCalledWith(maxContent, undefined, undefined);
    });
    it('should reject requests with invalid userId type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test', userId: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('userId must be a string');
    });

    it('should reject requests with content as null', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: null })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with content as array', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: ['test'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with content as object', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: { text: 'test' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should handle whitespace-only content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: '   \n\t  ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRewriteContent).toHaveBeenCalledWith('   \n\t  ', undefined, undefined);
    });

    it('should handle invalid JSON in request body', async () => {
      // Send invalid JSON directly
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .set('Content-Type', 'application/json')
        .send('invalid json {')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('An error occurred while processing your request');
    });

    it('should reject GET requests', async () => {
      const response = await request(server)
        .get('/api/v1/ai/rewrite')
        .expect(404);

      expect(response.body.error).toContain('Not found');
    });
  });
  });

  describe('Error Handling', () => {
    it('should handle rate limit exceeded errors', async () => {
      mockRewriteContent.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should handle circuit breaker open errors', async () => {
      mockRewriteContent.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service temporarily unavailable');
    });

    it('should handle unsafe content errors', async () => {
      mockRewriteContent.mockRejectedValue(new Error('Content contains unsafe content and cannot be processed.'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content contains unsafe content');
    });

    it('should handle generic AI service errors', async () => {
      mockRewriteContent.mockRejectedValue(new Error('AI service temporarily unavailable'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('An error occurred while processing your request');
    });

    it('should handle network timeouts', async () => {
      mockRewriteContent.mockRejectedValue(new Error('Timeout'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
    it('should handle OpenAI API errors', async () => {
      mockRewriteContent.mockRejectedValue(new Error('OpenAI API error: Service unavailable'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(502);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI service temporarily unavailable');
    });
    });
  });

  describe('Security and Headers', () => {
    it('should include correlation ID in response headers', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should set appropriate content type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should prevent XSS in error messages', async () => {
      mockRewriteContent.mockRejectedValue(new Error('<script>alert("xss")</script>'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(500);

      // Error should be sanitized
      expect(response.body.error).not.toContain('<script>');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/v1/ai/rewrite')
          .send({ content: 'test content' })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle rapid successive requests', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(server)
          .post('/api/v1/ai/rewrite')
          .send({ content: `test content ${i}` })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle content with special characters', async () => {
      const specialContent = 'Content with émojis 🎉 and spëcial chärs';

      await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: specialContent })
        .expect(200);

      expect(mockRewriteContent).toHaveBeenCalledWith(specialContent, undefined, undefined);
    });

    it('should handle content with newlines and tabs', async () => {
      const formattedContent = 'Line 1\n\tLine 2 with tab\nLine 3';

      await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: formattedContent })
        .expect(200);

      expect(mockRewriteContent).toHaveBeenCalledWith(formattedContent, undefined, undefined);
    });

    it('should handle very short content', async () => {
      const shortContent = 'Hi';

      await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: shortContent })
        .expect(200);

      expect(mockRewriteContent).toHaveBeenCalledWith(shortContent, undefined, undefined);
    });
  });
});