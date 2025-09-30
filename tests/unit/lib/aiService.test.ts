/**
 * Unit Tests for AI Service
 *
 * Tests AI service functions with focus on prompt determinism,
 * error handling, caching, rate limiting, and circuit breaker behavior.
 */

/// <reference types="jest" />

import { AIService, getAIService } from '../../../backend/lib/aiService';

// Mock all dependencies
jest.mock('../../../backend/lib/aiSecurity', () => ({
  sanitizePrompt: jest.fn(),
  validateAIContent: jest.fn(),
  trackAIPerformance: jest.fn(),
  logAISecurityEvent: jest.fn(),
}));

jest.mock('../../../backend/lib/cacheManager', () => ({
  getCacheManager: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('../../../backend/lib/metrics', () => ({
  trackAiMetrics: jest.fn(),
}));

jest.mock('../../../backend/lib/logger', () => ({
  globalLogger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock axios for rate limiting
jest.mock('axios', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({ post: jest.fn() })),
}));

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

describe('AIService', () => {
  let aiService: AIService;
  let mockCacheManager: any;
  let mockSanitizePrompt: any;
  let mockValidateAIContent: any;
  let mockTrackAIPerformance: any;
  let mockLogAISecurityEvent: any;
  let mockTrackAiMetrics: any;
  let mockGlobalLogger: any;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock instances
    mockCacheManager = require('../../../backend/lib/cacheManager').getCacheManager();
    mockSanitizePrompt = require('../../../backend/lib/aiSecurity').sanitizePrompt;
    mockValidateAIContent = require('../../../backend/lib/aiSecurity').validateAIContent;
    mockTrackAIPerformance = require('../../../backend/lib/aiSecurity').trackAIPerformance;
    mockLogAISecurityEvent = require('../../../backend/lib/aiSecurity').logAISecurityEvent;
    mockTrackAiMetrics = require('../../../backend/lib/metrics').trackAiMetrics;
    mockGlobalLogger = require('../../../backend/lib/logger').globalLogger;
    mockAxios = require('axios');

    // Setup default mocks
    mockSanitizePrompt.mockReturnValue('sanitized content');
    mockValidateAIContent.mockReturnValue({ safe: true, issues: [] });
    mockCacheManager.get.mockResolvedValue(null); // No cache hit by default
    mockCacheManager.set.mockResolvedValue(undefined);
    mockAxios.post.mockResolvedValue({ data: { allowed: true, retryAfter: 0 } });

    // Mock successful OpenAI response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'AI response content' } }],
      }),
    });

    aiService = new AIService({
      openaiApiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      maxRetries: 1,
      timeout: 1000,
      cacheTTL: 3600,
    });
  });

  describe('Prompt Determinism', () => {
    it('should generate consistent rewrite prompts for same input', () => {
      const content = 'Test content to rewrite';
      const style = 'professional';

      // Call createRewritePrompt multiple times
      const prompt1 = (aiService as any).createRewritePrompt(content, style);
      const prompt2 = (aiService as any).createRewritePrompt(content, style);

      expect(prompt1).toBe(prompt2);
      expect(prompt1).toContain('Rewrite the following content in a professional style');
      expect(prompt1).toContain(content);
    });

    it('should generate consistent suggestions prompts for same input', () => {
      const content = 'Test content for suggestions';

      const prompt1 = (aiService as any).createSuggestionsPrompt(content);
      const prompt2 = (aiService as any).createSuggestionsPrompt(content);

      expect(prompt1).toBe(prompt2);
      expect(prompt1).toContain('Analyze the following text and provide suggestions');
      expect(prompt1).toContain(content);
      expect(prompt1).toContain('JSON');
    });

    it('should generate consistent lint prompts for same input and language', () => {
      const content = 'Test content for linting';
      const language = 'javascript';

      const prompt1 = (aiService as any).createLintPrompt(content, language);
      const prompt2 = (aiService as any).createLintPrompt(content, language);

      expect(prompt1).toBe(prompt2);
      expect(prompt1).toContain('Analyze the following javascript content');
      expect(prompt1).toContain(content);
      expect(prompt1).toContain('JSON');
    });

    it('should handle different styles in rewrite prompts', () => {
      const content = 'Test content';

      const prompt1 = (aiService as any).createRewritePrompt(content, 'casual');
      const prompt2 = (aiService as any).createRewritePrompt(content, 'formal');
      const prompt3 = (aiService as any).createRewritePrompt(content); // No style

      expect(prompt1).toContain('casual style');
      expect(prompt2).toContain('formal style');
      expect(prompt3).not.toContain('style');
    });

    it('should handle different languages in lint prompts', () => {
      const content = 'Test content';

      const prompt1 = (aiService as any).createLintPrompt(content, 'python');
      const prompt2 = (aiService as any).createLintPrompt(content, 'text');

      expect(prompt1).toContain('python content');
      expect(prompt2).toContain('text content');
    });
  });

  describe('rewriteContent', () => {
    it('should successfully rewrite content', async () => {
      const result = await aiService.rewriteContent('test content', 'professional', 'user123');

      expect(result).toBe('AI response content');
      expect(mockSanitizePrompt).toHaveBeenCalledWith('test content');
      expect(mockValidateAIContent).toHaveBeenCalledWith('AI response content');
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(mockTrackAiMetrics).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number));
      expect(mockTrackAIPerformance).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number), true);
    });

    it('should return cached result when available', async () => {
      mockCacheManager.get.mockResolvedValue('cached result');

      const result = await aiService.rewriteContent('test content');

      expect(result).toBe('cached result');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // Simulate rate limit by making multiple calls quickly
      const promises = Array(11).fill(null).map(() =>
        aiService.rewriteContent('test', undefined, 'user123')
      );

      await expect(Promise.all(promises)).rejects.toThrow('Rate limit exceeded');
      expect(mockLogAISecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'rate_limit',
        severity: 'medium',
      }));
    });

    it('should handle unsafe content sanitization', async () => {
      mockSanitizePrompt.mockReturnValue(null); // Indicates unsafe content

      await expect(aiService.rewriteContent('unsafe content')).rejects.toThrow('Content contains unsafe content');
    });

    it('should handle AI validation failure', async () => {
      mockValidateAIContent.mockReturnValue({
        safe: false,
        issues: ['inappropriate content']
      });

      await expect(aiService.rewriteContent('test content')).rejects.toThrow('Generated content failed safety validation');
      expect(mockLogAISecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unsafe_content',
        severity: 'high',
      }));
    });

    it('should handle OpenAI API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(aiService.rewriteContent('test content')).rejects.toThrow('AI service failed after all retries');
    });

    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(aiService.rewriteContent('test content')).rejects.toThrow();
    });

    it('should retry on failure and succeed', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Success after retry' } }],
          }),
        });
      });

      aiService = new AIService({
        openaiApiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        maxRetries: 2,
        timeout: 1000,
        cacheTTL: 3600,
      });

      const result = await aiService.rewriteContent('test content');
      expect(result).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSuggestions', () => {
    it('should successfully get suggestions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"grammar": ["fix comma"], "style": ["use active voice"], "suggestions": ["be more concise"]}' } }],
        }),
      });

      const result = await aiService.getSuggestions('test content', 'user123');

      expect(result).toEqual({
        grammar: ['fix comma'],
        style: ['use active voice'],
        suggestions: ['be more concise'],
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'invalid json' } }],
        }),
      });

      const result = await aiService.getSuggestions('test content');

      expect(result).toEqual({
        grammar: [],
        style: [],
        suggestions: [],
      });
      expect(mockGlobalLogger.warn).toHaveBeenCalledWith('Failed to parse AI suggestions result:', expect.any(Error));
    });

    it('should return cached suggestions', async () => {
      const cachedResult = {
        grammar: ['cached grammar'],
        style: ['cached style'],
        suggestions: ['cached suggestion'],
      };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await aiService.getSuggestions('test content');

      expect(result).toBe(cachedResult);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('detectLintIssues', () => {
    it('should successfully detect lint issues', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"issues": [{"type": "error", "message": "missing semicolon", "line": 5, "column": 10, "severity": "error"}], "score": 85}' } }],
        }),
      });

      const result = await aiService.detectLintIssues('test code', 'javascript', 'user123');

      expect(result).toEqual({
        issues: [{
          type: 'error',
          message: 'missing semicolon',
          line: 5,
          column: 10,
          severity: 'error',
        }],
        score: 85,
      });
    });

    it('should handle missing API key', async () => {
      aiService = new AIService({ openaiApiKey: '' });

      await expect(aiService.detectLintIssues('test')).rejects.toThrow('OpenAI API key not configured');
    });

    it('should handle circuit breaker open state', async () => {
      // Force circuit breaker to open by simulating failures
      const circuitBreaker = (aiService as any).circuitBreaker;
      for (let i = 0; i < 6; i++) {
        try {
          await aiService.rewriteContent('fail');
        } catch (e) {
          // Ignore errors, just trigger failures
        }
      }

      await expect(aiService.detectLintIssues('test')).rejects.toThrow('Circuit breaker is open');
    });

    it('should parse lint results correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"issues": [], "score": 100}' } }],
        }),
      });

      const result = await aiService.detectLintIssues('perfect code');

      expect(result).toEqual({
        issues: [],
        score: 100,
      });
    });

    it('should handle invalid lint JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'not json' } }],
        }),
      });

      const result = await aiService.detectLintIssues('test');

      expect(result).toEqual({
        issues: [],
        score: 0,
      });
      expect(mockGlobalLogger.warn).toHaveBeenCalledWith('Failed to parse AI lint result:', expect.any(Error));
    });
  });

  describe('Circuit Breaker', () => {
    it('should handle circuit breaker recovery', async () => {
      const circuitBreaker = (aiService as any).circuitBreaker;

      // Force open state
      for (let i = 0; i < 5; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        try {
          await aiService.rewriteContent('fail');
        } catch (e) {}
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Wait for recovery timeout (mock it)
      jest.advanceTimersByTime(61000);

      // Next call should be half-open
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'success' } }],
        }),
      });

      const result = await aiService.rewriteContent('test');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should handle rate limiting service success', async () => {
      mockAxios.post.mockResolvedValue({
        data: { allowed: true, retryAfter: 0 }
      });

      const result = await aiService.rewriteContent('test content', undefined, 'user123');
      expect(result).toBe('AI response content');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/rate-limit/check'),
        { userId: 'user123', action: 'ai-rewrite' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': expect.any(String)
          })
        })
      );
    });

    it('should handle rate limiting service rejection', async () => {
      mockAxios.post.mockResolvedValue({
        data: { allowed: false, retryAfter: 60 }
      });

      await expect(aiService.rewriteContent('test content', undefined, 'user123'))
        .rejects.toThrow('Rate limit exceeded. Retry after 60 seconds.');

      expect(mockLogAISecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'rate_limit',
        severity: 'medium',
        userId: 'user123'
      }));
    });

    it('should handle rate limiting service network error', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      // Should still allow the request when rate limiting service is down
      const result = await aiService.rewriteContent('test content', undefined, 'user123');
      expect(result).toBe('AI response content');

      expect(mockGlobalLogger.error).toHaveBeenCalledWith('Rate limiting service error:', expect.any(Error));
      expect(mockLogAISecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'rate_limit',
        severity: 'high',
        userId: 'user123'
      }));
    });

    it('should skip rate limiting when no userId provided', async () => {
      const result = await aiService.rewriteContent('test content');
      expect(result).toBe('AI response content');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle getSuggestions rate limiting', async () => {
      mockAxios.post.mockResolvedValue({
        data: { allowed: false, retryAfter: 30 }
      });

      await expect(aiService.getSuggestions('test content', 'user123'))
        .rejects.toThrow('Rate limit exceeded. Retry after 30 seconds.');
    });

    it('should handle detectLintIssues rate limiting', async () => {
      mockAxios.post.mockResolvedValue({
        data: { allowed: false, retryAfter: 45 }
      });

      await expect(aiService.detectLintIssues('test code', 'javascript', 'user123'))
        .rejects.toThrow('Rate limit exceeded. Retry after 45 seconds.');
    });

    it('should handle getSuggestions cache hit', async () => {
      const cachedResult = {
        grammar: ['cached'],
        style: ['cached'],
        suggestions: ['cached']
      };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await aiService.getSuggestions('test content');
      expect(result).toBe(cachedResult);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTrackAiMetrics).toHaveBeenCalledWith('suggestions', 'gpt-3.5-turbo', expect.any(Number));
    });

    it('should handle detectLintIssues cache hit', async () => {
      const cachedResult = {
        issues: [{ type: 'error', message: 'cached', severity: 'error' }],
        score: 90
      };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await aiService.detectLintIssues('test code');
      expect(result).toBe(cachedResult);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTrackAiMetrics).toHaveBeenCalledWith('lint', 'gpt-3.5-turbo', expect.any(Number));
    });

    it('should handle getSuggestions unsafe content', async () => {
      mockSanitizePrompt.mockReturnValue(null);

      await expect(aiService.getSuggestions('unsafe content')).rejects.toThrow('Content contains unsafe content');
    });

    it('should handle detectLintIssues unsafe content', async () => {
      mockSanitizePrompt.mockReturnValue(null);

      await expect(aiService.detectLintIssues('unsafe code')).rejects.toThrow('Content contains unsafe content');
    });

    it('should handle getSuggestions AI validation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"grammar": [], "style": [], "suggestions": []}' } }],
        }),
      });
      mockValidateAIContent.mockReturnValue({ safe: false, issues: ['unsafe'] });

      await expect(aiService.getSuggestions('test content')).rejects.toThrow('Generated content failed safety validation');
    });

    it('should handle detectLintIssues AI validation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"issues": [], "score": 100}' } }],
        }),
      });
      mockValidateAIContent.mockReturnValue({ safe: false, issues: ['unsafe'] });

      await expect(aiService.detectLintIssues('test code')).rejects.toThrow('Generated content failed safety validation');
    });
  });

  describe('Performance and Metrics', () => {
    it('should track performance on rewrite success', async () => {
      await aiService.rewriteContent('test content');

      expect(mockTrackAIPerformance).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number), true);
    });

    it('should track performance on rewrite failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(aiService.rewriteContent('test content')).rejects.toThrow();

      expect(mockTrackAIPerformance).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number), false);
    });

    it('should track performance on suggestions success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"grammar": [], "style": [], "suggestions": []}' } }],
        }),
      });

      await aiService.getSuggestions('test content');

      expect(mockTrackAIPerformance).toHaveBeenCalledWith('suggestions', 'gpt-3.5-turbo', expect.any(Number), true);
    });

    it('should track performance on lint success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"issues": [], "score": 100}' } }],
        }),
      });

      await aiService.detectLintIssues('test code');

      expect(mockTrackAIPerformance).toHaveBeenCalledWith('lint', 'gpt-3.5-turbo', expect.any(Number), true);
    });
  });

  describe('Hash Function', () => {
    it('should generate consistent hashes', () => {
      const hash1 = (aiService as any).hashContent('test content');
      const hash2 = (aiService as any).hashContent('test content');

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = (aiService as any).hashContent('content 1');
      const hash2 = (aiService as any).hashContent('content 2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getAIService();
      const instance2 = getAIService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Health Status', () => {
    it('should return health status', () => {
      const health = aiService.getHealthStatus();

      expect(health).toHaveProperty('circuitBreakerState');
      expect(health).toHaveProperty('cacheHealthy');
      expect(health).toHaveProperty('rateLimitingService');
      expect(health.rateLimitingService).toHaveProperty('type', 'external');
      expect(health.rateLimitingService).toHaveProperty('url');
      expect(health.rateLimitingService).toHaveProperty('configured');
    });
  });
});