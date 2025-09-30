/**
 * Unit tests for AI Service
 *
 * Tests AI-powered content processing including:
 * - Content rewriting with security and caching
 * - Grammar and style suggestions
 * - Linting issue detection
 * - Rate limiting integration
 * - Circuit breaker resilience
 * - External dependencies mocking
 */

import { AIService, getAIService } from '../aiService';
import { sanitizePrompt, validateAIContent, logAISecurityEvent, trackAIPerformance } from '../aiSecurity';
import { getCacheManager } from '../cacheManager';
import { CircuitBreaker } from '../circuitBreaker';
import { trackAiMetrics } from '../metrics';
import { globalLogger } from '../logger';

// Mock external dependencies
jest.mock('../aiSecurity');
jest.mock('../cacheManager');
jest.mock('../circuitBreaker');
jest.mock('../metrics');
jest.mock('../logger');
jest.mock('axios');

describe('AIService', () => {
  let aiService: AIService;
  let mockCacheManager: any;
  let mockCircuitBreaker: any;
  let mockAxios: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockCircuitBreaker = {
      execute: jest.fn(),
      getState: jest.fn().mockReturnValue('closed'),
    };

    mockAxios = {
      post: jest.fn(),
    };

    // Mock the factory functions
    (getCacheManager as jest.Mock).mockReturnValue(mockCacheManager);
    (CircuitBreaker as jest.Mock).mockImplementation(() => mockCircuitBreaker);

    // Mock global fetch
    global.fetch = jest.fn();

    // Create service instance
    aiService = new AIService({
      openaiApiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      maxRetries: 3,
      timeout: 30000,
      cacheTTL: 3600,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config when no config provided', () => {
      const service = new AIService();
      expect(service).toBeDefined();
      expect(CircuitBreaker).toHaveBeenCalled();
    });

    it('should merge provided config with defaults', () => {
      const customConfig = { model: 'gpt-4', maxRetries: 5 };
      const service = new AIService(customConfig);
      expect(service).toBeDefined();
    });
  });

  describe('rewriteContent', () => {
    const testContent = 'This is test content to rewrite.';
    const testUserId = 'user123';

    beforeEach(() => {
      (sanitizePrompt as jest.Mock).mockReturnValue(testContent);
      (validateAIContent as jest.Mock).mockReturnValue({ safe: true, issues: [] });
      mockCircuitBreaker.execute.mockResolvedValue('Rewritten content');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'Rewritten content' } }] }),
      });
    });

    it('should successfully rewrite content without user ID', async () => {
      const result = await aiService.rewriteContent(testContent);

      expect(result).toBe('Rewritten content');
      expect(sanitizePrompt).toHaveBeenCalledWith(testContent);
      expect(validateAIContent).toHaveBeenCalledWith('Rewritten content');
      expect(trackAiMetrics).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number));
      expect(trackAIPerformance).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number), true);
    });

    it('should check rate limit when user ID provided', async () => {
      // Mock rate limiting service
      mockAxios.post.mockResolvedValue({ data: { allowed: true, retryAfter: 0 } });

      await aiService.rewriteContent(testContent, undefined, testUserId);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://rate-limiting-service:3004/api/v1/rate-limit/check',
        { userId: testUserId, action: 'ai-rewrite' },
        expect.any(Object)
      );
    });

    it('should throw error when rate limit exceeded', async () => {
      mockAxios.post.mockResolvedValue({ data: { allowed: false, retryAfter: 60 } });

      await expect(aiService.rewriteContent(testContent, undefined, testUserId))
        .rejects.toThrow('Rate limit exceeded. Retry after 60 seconds.');

      expect(logAISecurityEvent).toHaveBeenCalledWith({
        type: 'rate_limit',
        severity: 'medium',
        details: 'Rate limit exceeded for AI rewrite. Retry after 60 seconds.',
        userId: testUserId,
        timestamp: expect.any(Date),
      });
    });

    it('should return cached result when available', async () => {
      const cachedResult = 'Cached rewritten content';
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await aiService.rewriteContent(testContent);

      expect(result).toBe(cachedResult);
      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should reject unsafe input content', async () => {
      (sanitizePrompt as jest.Mock).mockReturnValue(null);

      await expect(aiService.rewriteContent(testContent))
        .rejects.toThrow('Content contains unsafe content');
    });

    it('should reject unsafe AI output', async () => {
      (validateAIContent as jest.Mock).mockReturnValue({
        safe: false,
        issues: ['Contains harmful content']
      });

      await expect(aiService.rewriteContent(testContent))
        .rejects.toThrow('Generated content failed safety validation');

      expect(logAISecurityEvent).toHaveBeenCalledWith({
        type: 'unsafe_content',
        severity: 'high',
        details: 'AI generated unsafe content: Contains harmful content',
        userId: undefined,
        timestamp: expect.any(Date),
      });
    });

    it('should handle circuit breaker failure', async () => {
      mockCircuitBreaker.execute.mockRejectedValue(new Error('Circuit breaker is open'));

      await expect(aiService.rewriteContent(testContent))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('should handle OpenAI API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(aiService.rewriteContent(testContent))
        .rejects.toThrow('OpenAI API error: 429 Too Many Requests');
    });

    it('should cache successful results', async () => {
      await aiService.rewriteContent(testContent);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('ai:rewrite:'),
        'Rewritten content',
        3600
      );
    });

    it('should track performance metrics on failure', async () => {
      mockCircuitBreaker.execute.mockRejectedValue(new Error('API Error'));

      await expect(aiService.rewriteContent(testContent)).rejects.toThrow();

      expect(trackAIPerformance).toHaveBeenCalledWith('rewrite', 'gpt-3.5-turbo', expect.any(Number), false);
    });
  });

  describe('getSuggestions', () => {
    const testContent = 'This is test content for suggestions.';
    const mockSuggestions = {
      grammar: ['Fix comma splice'],
      style: ['Use more active voice'],
      suggestions: ['Consider adding examples']
    };

    beforeEach(() => {
      (sanitizePrompt as jest.Mock).mockReturnValue(testContent);
      mockCircuitBreaker.execute.mockResolvedValue(JSON.stringify(mockSuggestions));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(mockSuggestions) } }] }),
      });
    });

    it('should successfully get suggestions', async () => {
      const result = await aiService.getSuggestions(testContent);

      expect(result).toEqual(mockSuggestions);
      expect(trackAiMetrics).toHaveBeenCalledWith('suggestions', 'gpt-3.5-turbo', expect.any(Number));
    });

    it('should return cached suggestions when available', async () => {
      mockCacheManager.get.mockResolvedValue(mockSuggestions);

      const result = await aiService.getSuggestions(testContent);

      expect(result).toEqual(mockSuggestions);
      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON response', async () => {
      mockCircuitBreaker.execute.mockResolvedValue('invalid json');

      const result = await aiService.getSuggestions(testContent);

      expect(result).toEqual({ grammar: [], style: [], suggestions: [] });
      expect(globalLogger.warn).toHaveBeenCalled();
    });
  });

  describe('detectLintIssues', () => {
    const testContent = 'This is test content for linting.';
    const mockLintResult = {
      issues: [
        { type: 'warning', message: 'Passive voice detected', line: 1, severity: 'warning' as const }
      ],
      score: 85
    };

    beforeEach(() => {
      (sanitizePrompt as jest.Mock).mockReturnValue(testContent);
      mockCircuitBreaker.execute.mockResolvedValue(JSON.stringify(mockLintResult));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(mockLintResult) } }] }),
      });
    });

    it('should successfully detect lint issues', async () => {
      const result = await aiService.detectLintIssues(testContent, 'text');

      expect(result).toEqual(mockLintResult);
      expect(trackAiMetrics).toHaveBeenCalledWith('lint', 'gpt-3.5-turbo', expect.any(Number));
    });

    it('should handle malformed lint response', async () => {
      mockCircuitBreaker.execute.mockResolvedValue('invalid json');

      const result = await aiService.detectLintIssues(testContent, 'text');

      expect(result).toEqual({ issues: [], score: 0 });
    });
  });

  describe('private methods', () => {
    describe('callOpenAI', () => {
      it('should throw error when API key not configured', async () => {
        const serviceWithoutKey = new AIService({ openaiApiKey: '' });

        await expect((serviceWithoutKey as any).callOpenAI('test prompt', 'test'))
          .rejects.toThrow('OpenAI API key not configured');
      });

      it('should handle timeout correctly', async () => {
        (global.fetch as jest.Mock).mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => ({ choices: [{ message: { content: 'response' } }] })
          }), 35000))
        );

        const serviceWithShortTimeout = new AIService({ timeout: 1000 });

        await expect((serviceWithShortTimeout as any).callOpenAI('test prompt', 'test'))
          .rejects.toThrow();
      });
    });

    describe('hashContent', () => {
      it('should generate consistent hash for same content', () => {
        const hash1 = (aiService as any).hashContent('test content');
        const hash2 = (aiService as any).hashContent('test content');

        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
      });

      it('should generate different hashes for different content', () => {
        const hash1 = (aiService as any).hashContent('content 1');
        const hash2 = (aiService as any).hashContent('content 2');

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('checkRateLimit', () => {
      it('should handle rate limiting service errors gracefully', async () => {
        mockAxios.post.mockRejectedValue(new Error('Service unavailable'));

        const result = await (aiService as any).checkRateLimit('user123', 'test-action');

        expect(result).toEqual({ allowed: true, retryAfter: 0 });
        expect(globalLogger.error).toHaveBeenCalled();
        expect(logAISecurityEvent).toHaveBeenCalled();
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status with circuit breaker state', () => {
      mockCircuitBreaker.getState.mockReturnValue('half-open');

      const health = aiService.getHealthStatus();

      expect(health).toEqual({
        circuitBreakerState: 'half-open',
        cacheHealthy: true,
        rateLimitingService: {
          type: 'external',
          url: 'http://rate-limiting-service:3004',
          configured: true,
        },
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getAIService', () => {
      const instance1 = getAIService();
      const instance2 = getAIService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('error scenarios', () => {
    it('should handle fetch network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(aiService.rewriteContent('test'))
        .rejects.toThrow('Network error');
    });

    it('should handle malformed API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [] }),
      });

      await expect(aiService.rewriteContent('test'))
        .rejects.toThrow();
    });
  });
});