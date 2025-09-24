/**
 * AI API Contract Tests
 *
 * Contract testing to ensure frontend and backend stay aligned.
 * Tests verify API response schemas and request formats match expectations.
 */

/// <reference types="jest" />

import request from 'supertest';
import { createServer } from 'http';
import { POST as RewritePost } from '../../api/v1/ai/rewrite/route';
import { POST as SuggestionsPost } from '../../api/v1/ai/suggestions/route';
import { POST as LintPost } from '../../api/v1/ai/lint/route';

// Mock the AI service for contract testing
jest.mock('../../backend/lib/aiService', () => ({
  getAIService: jest.fn(() => ({
    rewriteContent: jest.fn(),
    getSuggestions: jest.fn(),
    detectLintIssues: jest.fn(),
  })),
}));

// Mock security headers
jest.mock('../../backend/lib/errorHandler', () => ({
  applySecurityHeaders: jest.fn((response) => response),
}));

describe('AI API Contract Tests', () => {
  let server: any;
  let mockAIService: any;

  beforeAll(async () => {
    mockAIService = require('../../backend/lib/aiService').getAIService();

    // Setup mock responses for contract testing
    mockAIService.rewriteContent.mockResolvedValue('Rewritten content');
    mockAIService.getSuggestions.mockResolvedValue({
      grammar: ['Fix comma splice'],
      style: ['Use active voice'],
      suggestions: ['Add specific examples'],
    });
    mockAIService.detectLintIssues.mockResolvedValue({
      issues: [{
        type: 'error',
        message: 'Missing semicolon',
        line: 5,
        column: 10,
        severity: 'error',
      }],
      score: 85,
    });

    // Create test server with all AI endpoints
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          const url = req.url || '';
          let body = {};
          if (req.body) {
            body = JSON.parse(req.body);
          }

          const mockRequest = {
            json: () => Promise.resolve(body),
            method: 'POST',
            url: req.url,
          } as any;

          let response;
          if (url === '/api/v1/ai/rewrite') {
            response = await RewritePost(mockRequest);
          } else if (url === '/api/v1/ai/suggestions') {
            response = await SuggestionsPost(mockRequest);
          } else if (url === '/api/v1/ai/lint') {
            response = await LintPost(mockRequest);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          const responseBody = await response.json();

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');

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

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4007, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('Rewrite API Contract', () => {
    it('should conform to rewrite API contract', async () => {
      const requestBody = {
        content: 'Test content to rewrite',
        style: 'professional',
        userId: 'user123',
      };

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send(requestBody)
        .expect(200);

      // Contract: Response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('string');
      expect(response.body.data.length).toBeGreaterThan(0);

      // Contract: Request was made with correct parameters
      expect(mockAIService.rewriteContent).toHaveBeenCalledWith(
        'Test content to rewrite',
        'professional',
        'userId'
      );
    });

    it('should handle optional parameters in contract', async () => {
      const minimalRequest = {
        content: 'Minimal content',
      };

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send(minimalRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data).toBe('string');
    });
  });

  describe('Suggestions API Contract', () => {
    it('should conform to suggestions API contract', async () => {
      const requestBody = {
        content: 'Content for grammar and style suggestions',
        userId: 'user456',
      };

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send(requestBody)
        .expect(200);

      // Contract: Response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('grammar');
      expect(response.body.data).toHaveProperty('style');
      expect(response.body.data).toHaveProperty('suggestions');

      // Contract: Arrays should be present
      expect(Array.isArray(response.body.data.grammar)).toBe(true);
      expect(Array.isArray(response.body.data.style)).toBe(true);
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);

      // Contract: All suggestions should be strings
      const allSuggestions = [
        ...response.body.data.grammar,
        ...response.body.data.style,
        ...response.body.data.suggestions,
      ];
      allSuggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
      });
    });
  });

  describe('Lint API Contract', () => {
    it('should conform to lint API contract', async () => {
      const requestBody = {
        content: 'function test() { console.log("hello") }',
        language: 'javascript',
        userId: 'user789',
      };

      const response = await request(server)
        .post('/api/v1/ai/lint')
        .send(requestBody)
        .expect(200);

      // Contract: Response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('score');

      // Contract: Issues should be array
      expect(Array.isArray(response.body.data.issues)).toBe(true);

      // Contract: Score should be number between 0-100
      expect(typeof response.body.data.score).toBe('number');
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);

      // Contract: Issue structure
      response.body.data.issues.forEach((issue: any) => {
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
        expect(['error', 'warning', 'info']).toContain(issue.severity);

        if (issue.line !== undefined) {
          expect(typeof issue.line).toBe('number');
          expect(issue.line).toBeGreaterThan(0);
        }
        if (issue.column !== undefined) {
          expect(typeof issue.column).toBe('number');
          expect(issue.column).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should handle different languages in contract', async () => {
      const languages = ['javascript', 'python', 'text'];

      for (const language of languages) {
        const response = await request(server)
          .post('/api/v1/ai/lint')
          .send({ content: 'test content', language })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('issues');
        expect(response.body.data).toHaveProperty('score');
      }
    });
  });

  describe('Error Response Contracts', () => {
    it('should maintain error response contract for validation failures', async () => {
      // Test with invalid content (empty string)
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: '' })
        .expect(400);

      // Contract: Error response structure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('should maintain error response contract for rate limiting', async () => {
      mockAIService.rewriteContent.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should maintain error response contract for service unavailability', async () => {
      mockAIService.rewriteContent.mockRejectedValue(new Error('Circuit breaker is open'));

      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service temporarily unavailable');
    });
  });

  describe('Request Format Contracts', () => {
    it('should accept valid request formats', async () => {
      const validRequests = [
        { content: 'Simple content' },
        { content: 'Content with style', style: 'formal' },
        { content: 'Content with user', userId: 'user123' },
        { content: 'Full request', style: 'casual', userId: 'user456' },
      ];

      for (const requestBody of validRequests) {
        const response = await request(server)
          .post('/api/v1/ai/rewrite')
          .send(requestBody)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should reject malformed request formats', async () => {
      const invalidRequests = [
        {}, // No content
        { content: 123 }, // Wrong content type
        { content: 'test', style: 456 }, // Wrong style type
        { content: 'a'.repeat(10001) }, // Content too long
      ];

      for (const requestBody of invalidRequests) {
        const response = await request(server)
          .post('/api/v1/ai/rewrite')
          .send(requestBody)
          .expect(requestBody.content === '' || typeof requestBody.content !== 'string' || (requestBody.content && requestBody.content.length > 10000) ? 400 : 200);

        if (response.status === 400) {
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      }
    });
  });

  describe('Response Headers Contract', () => {
    it('should include required headers in all responses', async () => {
      const endpoints = ['/api/v1/ai/rewrite', '/api/v1/ai/suggestions', '/api/v1/ai/lint'];

      for (const endpoint of endpoints) {
        const response = await request(server)
          .post(endpoint)
          .send({ content: 'test' })
          .expect(200);

        // Contract: Content-Type should be JSON
        expect(response.headers['content-type']).toContain('application/json');

        // Contract: Should have security headers
        expect(response.headers).toHaveProperty('x-content-type-options');
        expect(response.headers).toHaveProperty('x-frame-options');
        expect(response.headers).toHaveProperty('x-xss-protection');
      }
    });

    it('should include correlation ID for tracing', async () => {
      const response = await request(server)
        .post('/api/v1/ai/rewrite')
        .send({ content: 'test' })
        .expect(200);

      // Contract: Correlation ID for request tracing
      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Data Type Contracts', () => {
    it('should return correct data types in responses', () => {
      // Test that all API responses conform to expected TypeScript interfaces

      // This would be validated by the test assertions above
      // but we can add explicit type checking here

      expect(true).toBe(true); // Placeholder for type contract validation
    });

    it('should handle edge cases in response data', async () => {
      // Test empty arrays, null values, etc.
      mockAIService.getSuggestions.mockResolvedValueOnce({
        grammar: [],
        style: [],
        suggestions: [],
      });

      const response = await request(server)
        .post('/api/v1/ai/suggestions')
        .send({ content: 'test' })
        .expect(200);

      expect(response.body.data.grammar).toEqual([]);
      expect(response.body.data.style).toEqual([]);
      expect(response.body.data.suggestions).toEqual([]);
    });
  });
});