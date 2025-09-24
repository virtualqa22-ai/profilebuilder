/**
 * AI Suggestions API Integration Tests
 *
 * Tests the complete AI suggestions endpoint functionality including:
 * - Request validation and sanitization
 * - AI service integration for grammar/style suggestions
 * - Error handling and user feedback
 * - Security headers and rate limiting
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import { POST } from '../../../api/v1/ai/suggestions/route';
import { TestUtils } from '../setup/test-setup.test';

// Mock the AI service
jest.mock('../../../backend/lib/aiService', () => ({
  getAIService: jest.fn(() => ({
    getSuggestions: jest.fn(),
  })),
}));

// Mock security headers
jest.mock('../../../backend/lib/errorHandler', () => ({
  applySecurityHeaders: jest.fn((response) => response),
}));

describe('AI Suggestions API Integration Tests', () => {
  let server: any;
  let mockAIService: any;
  let mockGetSuggestions: any;

  beforeAll(async () => {
    // Get mock instances
    mockAIService = require('../../../backend/lib/aiService').getAIService();
    mockGetSuggestions = mockAIService.getSuggestions;

    // Create test server
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling for POST
          if (req.method === 'POST' && req.url === '/api/v1/ai/suggestions') {
            // Parse request body
            let body = {};
            if (req.body) {
              body = JSON.parse(req.body);
            }

            // Create a mock NextRequest
            const mockRequest = {
              json: () => Promise.resolve(body),
              method: 'POST',
              url: req.url,
            } as any;

            // Call the actual POST handler
            const response = await POST(mockRequest);

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
      server.listen(4005, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSuggestions.mockResolvedValue({
      grammar: ['Consider using active voice', 'Fix comma splice'],
      style: ['Use more concise language', 'Vary sentence structure'],
      suggestions: ['Consider adding specific examples', 'Strengthen opening statement'],
    });
  });

  describe('POST /api/v1/ai/suggestions - Successful Requests', () => {
    it('should successfully get suggestions for content', async () => {
      const requestBody = {
        content: 'This is some content that need grammar and style suggestions.',
      };

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('grammar');
      expect(response.body.data).toHaveProperty('style');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.grammar)).toBe(true);
      expect(Array.isArray(response.body.data.style)).toBe(true);
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      expect(mockGetSuggestions).toHaveBeenCalledWith('This is some content that need grammar and style suggestions.', undefined);
    });

    it('should handle userId parameter', async () => {
      const requestBody = {
        content: 'Test content for suggestions',
        userId: 'user123',
      };

      await request(server)
        .post('/api/v1/ai/suggestions')
        .send(requestBody)
        .expect(200);

      expect(mockGetSuggestions).toHaveBeenCalledWith('Test content for suggestions', 'user123');
    });

    it('should apply security headers to successful responses', async () => {
      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });
  });

  describe('Request Validation', () => {
    it('should reject requests without content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required');
      expect(mockGetSuggestions).not.toHaveBeenCalled();
    });

    it('should reject requests with non-string content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject content exceeding maximum length', async () => {
      const longContent = 'a'.repeat(10001);

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: longContent })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content exceeds maximum length');
    });

    it('should accept content at maximum allowed length', async () => {
      const maxContent = 'a'.repeat(10000);

      await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: maxContent })
        .expect(200);

      expect(mockGetSuggestions).toHaveBeenCalledWith(maxContent, undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit exceeded errors', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should handle circuit breaker open errors', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service temporarily unavailable');
    });

    it('should handle unsafe content errors', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('Content contains unsafe content and cannot be processed.'));

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content contains unsafe content');
    });

    it('should handle generic AI service errors', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('AI service temporarily unavailable'));

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('An error occurred while processing your request');
    });
  });

  describe('Response Structure Validation', () => {
    it('should return properly structured suggestions response', async () => {
      const expectedSuggestions = {
        grammar: ['Check subject-verb agreement'],
        style: ['Use more active voice'],
        suggestions: ['Add specific metrics'],
      };

      mockGetSuggestions.mockResolvedValue(expectedSuggestions);

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(200);

      expect(response.body.data).toEqual(expectedSuggestions);
      expect(Array.isArray(response.body.data.grammar)).toBe(true);
      expect(Array.isArray(response.body.data.style)).toBe(true);
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should handle empty suggestions arrays', async () => {
      mockGetSuggestions.mockResolvedValue({
        grammar: [],
        style: [],
        suggestions: [],
      });

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'perfect content' })
        .expect(200);

      expect(response.body.data.grammar).toEqual([]);
      expect(response.body.data.style).toEqual([]);
      expect(response.body.data.suggestions).toEqual([]);
    });
  });

  describe('Security and Headers', () => {
    it('should include correlation ID in response headers', async () => {
      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should set appropriate content type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/v1/ai/suggestions')
          .send({ content: 'test content' })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});