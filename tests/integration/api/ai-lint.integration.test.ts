/**
 * AI Lint API Integration Tests
 *
 * Tests the complete AI lint endpoint functionality including:
 * - Request validation and sanitization
 * - AI service integration for linting issues detection
 * - Error handling and user feedback
 * - Security headers and rate limiting
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import { POST } from '../../../api/v1/ai/lint/route';
import { TestUtils } from '../setup/test-setup.test';

// Mock the AI service
jest.mock('../../../backend/lib/aiService', () => ({
  getAIService: jest.fn(() => ({
    detectLintIssues: jest.fn(),
  })),
}));

// Mock security headers
jest.mock('../../../backend/lib/errorHandler', () => ({
  applySecurityHeaders: jest.fn((response) => response),
}));

describe('AI Lint API Integration Tests', () => {
  let server: any;
  let mockAIService: any;
  let mockDetectLintIssues: any;

  beforeAll(async () => {
    // Get mock instances
    mockAIService = require('../../../backend/lib/aiService').getAIService();
    mockDetectLintIssues = mockAIService.detectLintIssues;

    // Create test server
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling for POST
          if (req.method === 'POST' && req.url === '/api/v1/ai/lint') {
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
      server.listen(4006, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectLintIssues.mockResolvedValue({
      issues: [
        {
          type: 'error',
          message: 'Missing semicolon',
          line: 5,
          column: 15,
          severity: 'error',
        },
        {
          type: 'warning',
          message: 'Unused variable',
          line: 10,
          column: 5,
          severity: 'warning',
        },
      ],
      score: 75,
    });
  });

  describe('POST /api/v1/ai/lint - Successful Requests', () => {
    it('should successfully detect lint issues in content', async () => {
      const requestBody = {
        content: 'function test() { console.log("hello") }', // Missing semicolon
        language: 'javascript',
      };

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('score');
      expect(Array.isArray(response.body.data.issues)).toBe(true);
      expect(typeof response.body.data.score).toBe('number');
      expect(mockDetectLintIssues).toHaveBeenCalledWith('function test() { console.log("hello") }', 'javascript', undefined);
    });

    it('should handle default language parameter', async () => {
      const requestBody = {
        content: 'Some text content to lint',
      };

      await request(server)
        .post('/api/v1/ai/lint')
        .send(requestBody)
        .expect(200);

      expect(mockDetectLintIssues).toHaveBeenCalledWith('Some text content to lint', 'text', undefined);
    });

    it('should handle userId parameter', async () => {
      const requestBody = {
        content: 'test content',
        language: 'markdown',
        userId: 'user123',
      };

      await request(server)
        .post('/api/v1/ai/lint')
        .send(requestBody)
        .expect(200);

      expect(mockDetectLintIssues).toHaveBeenCalledWith('test content', 'markdown', 'user123');
    });

    it('should apply security headers to successful responses', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });
  });

  describe('Request Validation', () => {
    it('should reject requests without content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required');
      expect(mockDetectLintIssues).not.toHaveBeenCalled();
    });

    it('should reject requests with non-string content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject content exceeding maximum length', async () => {
      const longContent = 'a'.repeat(10001);

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: longContent })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content exceeds maximum length');
    });

    it('should reject requests with invalid language type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test', language: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Language must be a string');
    });

    it('should accept content at maximum allowed length', async () => {
      const maxContent = 'a'.repeat(10000);

      await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: maxContent })
        .expect(200);

      expect(mockDetectLintIssues).toHaveBeenCalledWith(maxContent, 'text', undefined);
    });

    it('should reject requests with invalid userId type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test', userId: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('userId must be a string');
    });

    it('should reject requests with content as null', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: null })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with content as undefined', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: undefined })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with content as array', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: ['test'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should reject requests with content as object', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: { text: 'test' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content is required and must be a string');
    });

    it('should handle whitespace-only content', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: '   \n\t  ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockDetectLintIssues).toHaveBeenCalledWith('   \n\t  ', 'text', undefined);
    });

    it('should handle invalid JSON in request body', async () => {
      // Send invalid JSON directly
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .set('Content-Type', 'application/json')
        .send('invalid json {')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('An error occurred while processing your request');
    });

    it('should reject GET requests', async () => {
      const response = await request(server)
        .get('/api/v1/ai/lint')
        .expect(404);

      expect(response.body.error).toContain('Not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit exceeded errors', async () => {
      mockDetectLintIssues.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should handle circuit breaker open errors', async () => {
      mockDetectLintIssues.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service temporarily unavailable');
    });

    it('should handle unsafe content errors', async () => {
      mockDetectLintIssues.mockRejectedValue(new Error('Content contains unsafe content and cannot be processed.'));

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content contains unsafe content');
    });
    it('should handle OpenAI API errors', async () => {
      mockDetectLintIssues.mockRejectedValue(new Error('OpenAI API error: Service unavailable'));

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(502);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI service temporarily unavailable');
    });
  });

  describe('Response Structure Validation', () => {
    it('should return properly structured lint response', async () => {
      const expectedLintResult = {
        issues: [
          {
            type: 'error',
            message: 'Syntax error',
            line: 1,
            column: 10,
            severity: 'error',
          },
        ],
        score: 85,
      };

      mockDetectLintIssues.mockResolvedValue(expectedLintResult);

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(200);

      expect(response.body.data).toEqual(expectedLintResult);
      expect(Array.isArray(response.body.data.issues)).toBe(true);
      expect(typeof response.body.data.score).toBe('number');
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);
    });

    it('should handle empty issues array', async () => {
      mockDetectLintIssues.mockResolvedValue({
        issues: [],
        score: 100,
      });

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'perfect code' })
        .expect(200);

      expect(response.body.data.issues).toEqual([]);
      expect(response.body.data.score).toBe(100);
    });

    it('should validate issue structure', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(200);

      const issues = response.body.data.issues;
      issues.forEach((issue: any) => {
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
        expect(['error', 'warning', 'info']).toContain(issue.severity);
        if (issue.line) {
          expect(typeof issue.line).toBe('number');
          expect(issue.line).toBeGreaterThan(0);
        }
        if (issue.column) {
          expect(typeof issue.column).toBe('number');
          expect(issue.column).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Security and Headers', () => {
    it('should include correlation ID in response headers', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should set appropriate content type', async () => {
      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/v1/ai/lint')
          .send({ content: 'test content' })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Language Support', () => {
    it('should support different programming languages', async () => {
      const languages = ['javascript', 'python', 'java', 'typescript', 'text'];

      for (const language of languages) {
        await request(server)
          .post('/api/v1/ai/lint')
          .send({ content: 'test content', language })
          .expect(200);

        expect(mockDetectLintIssues).toHaveBeenCalledWith('test content', language, undefined);
      }
    });

    it('should handle unknown languages gracefully', async () => {
      await request(server)
        .post('/api/v1/ai/lint')
        .send({ content: 'test', language: 'unknownlang' })
        .expect(200);

      expect(mockDetectLintIssues).toHaveBeenCalledWith('test', 'unknownlang', undefined);
    });
  });
});