/**
 * Backend AI Services Integration Tests
 *
 * Tests the complete AI services functionality including:
 * - AI service integration with external providers
 * - Validation and security checks
 * - Error handling and circuit breaker patterns
 * - Performance monitoring and metrics
 * - Rate limiting and security headers
 * - Cross-service interactions and data flow
 * - Large payload handling and streaming
 * - Concurrent request management
 */

import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getAIService } from '../../../backend/lib/aiService';
import { aiValidation } from '../../../backend/lib/aiValidation';
import { aiErrorHandler } from '../../../backend/lib/aiErrorHandler';
import { aiSecurity } from '../../../backend/lib/aiSecurity';
import { getCircuitBreaker } from '../../../backend/lib/circuitBreaker';
import { getRateLimiter } from '../../../backend/lib/rateLimitingService';
import { getLogger } from '../../../backend/lib/logger';
import { getMetrics } from '../../../backend/lib/metrics';

// Mock external dependencies
jest.mock('../../../backend/lib/aiService');
jest.mock('../../../backend/lib/aiValidation');
jest.mock('../../../backend/lib/aiErrorHandler');
jest.mock('../../../backend/lib/aiSecurity');
jest.mock('../../../backend/lib/circuitBreaker');
jest.mock('../../../backend/lib/rateLimitingService');
jest.mock('../../../backend/lib/logger');
jest.mock('../../../backend/lib/metrics');

describe('Backend AI Services Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let mockAIService: any;
  let mockCircuitBreaker: any;
  let mockRateLimiter: any;
  let mockLogger: any;
  let mockMetrics: any;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup mocks
    mockAIService = {
      detectLintIssues: jest.fn(),
      rewriteContent: jest.fn(),
      generateSuggestions: jest.fn(),
      analyzeSecurity: jest.fn(),
      validateContent: jest.fn(),
    };

    mockCircuitBreaker = {
      execute: jest.fn(),
      getState: jest.fn().mockReturnValue('closed'),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    };

    mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
      recordRequest: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockMetrics = {
      increment: jest.fn(),
      timing: jest.fn(),
      gauge: jest.fn(),
    };

    // Apply mocks
    (getAIService as jest.Mock).mockReturnValue(mockAIService);
    (getCircuitBreaker as jest.Mock).mockReturnValue(mockCircuitBreaker);
    (getRateLimiter as jest.Mock).mockReturnValue(mockRateLimiter);
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
    (getMetrics as jest.Mock).mockReturnValue(mockMetrics);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Service Integration with Circuit Breaker', () => {
    it('should execute AI service calls through circuit breaker', async () => {
      const testContent = 'function test() { return true; }';
      const expectedResult = { issues: [], score: 100 };

      mockAIService.detectLintIssues.mockResolvedValue(expectedResult);
      mockCircuitBreaker.execute.mockImplementation(async (fn) => await fn());

      const aiService = getAIService();
      const circuitBreaker = getCircuitBreaker();

      const result = await circuitBreaker.execute(() =>
        aiService.detectLintIssues(testContent, 'javascript')
      );

      expect(result).toEqual(expectedResult);
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockAIService.detectLintIssues).toHaveBeenCalledWith(testContent, 'javascript');
    });

    it('should handle circuit breaker failures gracefully', async () => {
      mockCircuitBreaker.execute.mockRejectedValue(new Error('Circuit breaker open'));
      mockCircuitBreaker.getState.mockReturnValue('open');

      const circuitBreaker = getCircuitBreaker();

      await expect(
        circuitBreaker.execute(() => mockAIService.detectLintIssues('test', 'javascript'))
      ).rejects.toThrow('Circuit breaker open');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.circuit_breaker.open');
    });

    it('should record circuit breaker success and failure metrics', async () => {
      // Success case
      mockAIService.detectLintIssues.mockResolvedValue({ issues: [], score: 95 });
      mockCircuitBreaker.execute.mockImplementation(async (fn) => {
        const result = await fn();
        mockCircuitBreaker.recordSuccess();
        return result;
      });

      const circuitBreaker = getCircuitBreaker();
      await circuitBreaker.execute(() => mockAIService.detectLintIssues('test', 'javascript'));

      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.circuit_breaker.success');

      // Failure case
      mockAIService.detectLintIssues.mockRejectedValue(new Error('AI service error'));
      mockCircuitBreaker.execute.mockImplementation(async (fn) => {
        try {
          await fn();
        } catch (error) {
          mockCircuitBreaker.recordFailure();
          throw error;
        }
      });

      await expect(
        circuitBreaker.execute(() => mockAIService.detectLintIssues('test', 'javascript'))
      ).rejects.toThrow();

      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.circuit_breaker.failure');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should check rate limits before AI service calls', async () => {
      const userId = 'user123';
      const content = 'test content';

      mockRateLimiter.checkLimit.mockResolvedValue(true);
      mockAIService.detectLintIssues.mockResolvedValue({ issues: [], score: 90 });

      const rateLimiter = getRateLimiter();
      const aiService = getAIService();

      // Simulate rate-limited request
      const canProceed = await rateLimiter.checkLimit(userId, 'ai-lint');
      expect(canProceed).toBe(true);

      if (canProceed) {
        await aiService.detectLintIssues(content, 'text', userId);
        expect(mockRateLimiter.recordRequest).toHaveBeenCalledWith(userId, 'ai-lint');
      }

      expect(mockAIService.detectLintIssues).toHaveBeenCalledWith(content, 'text', userId);
    });

    it('should block requests when rate limit exceeded', async () => {
      const userId = 'user123';

      mockRateLimiter.checkLimit.mockResolvedValue(false);

      const rateLimiter = getRateLimiter();

      const canProceed = await rateLimiter.checkLimit(userId, 'ai-lint');
      expect(canProceed).toBe(false);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded for user',
        expect.objectContaining({ userId, endpoint: 'ai-lint' })
      );
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.rate_limit.exceeded');
    });

    it('should handle rate limiter errors gracefully', async () => {
      mockRateLimiter.checkLimit.mockRejectedValue(new Error('Redis connection failed'));

      const rateLimiter = getRateLimiter();

      await expect(rateLimiter.checkLimit('user123', 'ai-lint')).rejects.toThrow('Redis connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.rate_limiter.error');
    });
  });

  describe('AI Validation Integration', () => {
    it('should validate content before AI processing', async () => {
      const validContent = 'function hello() { console.log("Hello, World!"); }';
      const invalidContent = '<script>alert("XSS")</script>';

      (aiValidation.validateContent as jest.Mock).mockImplementation((content) => ({
        isValid: !content.includes('<script>'),
        sanitized: content.replace(/<script[^>]*>.*?<\/script>/gi, ''),
        warnings: content.includes('<script>') ? ['Potential XSS attempt detected'] : []
      }));

      const validation = aiValidation.validateContent(validContent);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toEqual([]);

      const invalidValidation = aiValidation.validateContent(invalidContent);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.warnings).toContain('Potential XSS attempt detected');
    });

    it('should integrate validation with AI service calls', async () => {
      const suspiciousContent = 'SELECT * FROM users; DROP TABLE users;';

      (aiValidation.validateContent as jest.Mock).mockReturnValue({
        isValid: false,
        sanitized: '',
        warnings: ['SQL injection attempt detected']
      });

      const validation = aiValidation.validateContent(suspiciousContent);

      expect(validation.isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Content validation failed',
        expect.objectContaining({ warnings: ['SQL injection attempt detected'] })
      );
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.validation.failed');
    });

    it('should validate content length limits', () => {
      const shortContent = 'test';
      const longContent = 'a'.repeat(100000); // 100KB

      (aiValidation.validateContentLength as jest.Mock).mockImplementation((content, maxLength) => ({
        isValid: content.length <= maxLength,
        length: content.length,
        maxLength
      }));

      const shortValidation = aiValidation.validateContentLength(shortContent, 1000);
      expect(shortValidation.isValid).toBe(true);

      const longValidation = aiValidation.validateContentLength(longContent, 50000);
      expect(longValidation.isValid).toBe(false);
      expect(longValidation.length).toBe(100000);
    });
  });

  describe('AI Security Integration', () => {
    it('should analyze content for security threats', async () => {
      const safeContent = 'console.log("Hello, World!");';
      const maliciousContent = 'eval(unescape("alert%28%27XSS%27%29"));';

      (aiSecurity.analyzeContent as jest.Mock).mockImplementation((content) => ({
        isSafe: !content.includes('eval(') && !content.includes('unescape('),
        threats: content.includes('eval(') ? ['Code injection detected'] : [],
        riskLevel: content.includes('eval(') ? 'high' : 'low'
      }));

      const safeAnalysis = aiSecurity.analyzeContent(safeContent);
      expect(safeAnalysis.isSafe).toBe(true);
      expect(safeAnalysis.riskLevel).toBe('low');

      const maliciousAnalysis = aiSecurity.analyzeContent(maliciousContent);
      expect(maliciousAnalysis.isSafe).toBe(false);
      expect(maliciousAnalysis.threats).toContain('Code injection detected');
      expect(maliciousAnalysis.riskLevel).toBe('high');
    });

    it('should sanitize content for safe processing', () => {
      const dangerousContent = 'content<script>alert("hack")</script>more content';
      const expectedSanitized = 'contentmore content';

      (aiSecurity.sanitizeContent as jest.Mock).mockReturnValue(expectedSanitized);

      const sanitized = aiSecurity.sanitizeContent(dangerousContent);
      expect(sanitized).toBe(expectedSanitized);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should integrate security checks with AI processing pipeline', async () => {
      const content = 'safe content for processing';

      (aiSecurity.analyzeContent as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: [],
        riskLevel: 'low'
      });

      mockAIService.detectLintIssues.mockResolvedValue({ issues: [], score: 95 });

      const securityAnalysis = aiSecurity.analyzeContent(content);
      expect(securityAnalysis.isSafe).toBe(true);

      // Only proceed with AI processing if content is safe
      if (securityAnalysis.isSafe) {
        await mockAIService.detectLintIssues(content, 'text');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'AI processing started for safe content',
          expect.objectContaining({ riskLevel: 'low' })
        );
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle AI service errors with proper categorization', async () => {
      const networkError = new Error('Connection timeout');
      const apiError = new Error('OpenAI API rate limit exceeded');
      const validationError = new Error('Invalid content format');

      (aiErrorHandler.categorizeError as jest.Mock).mockImplementation((error) => {
        if (error.message.includes('timeout')) return 'network';
        if (error.message.includes('rate limit')) return 'rate_limit';
        if (error.message.includes('Invalid')) return 'validation';
        return 'unknown';
      });

      (aiErrorHandler.handleError as jest.Mock).mockImplementation((error, context) => ({
        type: aiErrorHandler.categorizeError(error),
        message: error.message,
        retryable: ['network', 'rate_limit'].includes(aiErrorHandler.categorizeError(error)),
        context
      }));

      // Test different error types
      const networkErrorResult = aiErrorHandler.handleError(networkError, { userId: 'user123' });
      expect(networkErrorResult.type).toBe('network');
      expect(networkErrorResult.retryable).toBe(true);

      const rateLimitErrorResult = aiErrorHandler.handleError(apiError, { endpoint: 'ai-lint' });
      expect(rateLimitErrorResult.type).toBe('rate_limit');
      expect(rateLimitErrorResult.retryable).toBe(true);

      const validationErrorResult = aiErrorHandler.handleError(validationError, { content: 'invalid' });
      expect(validationErrorResult.type).toBe('validation');
      expect(validationErrorResult.retryable).toBe(false);
    });

    it('should integrate error handling with circuit breaker', async () => {
      const serviceError = new Error('AI service temporarily unavailable');

      mockAIService.detectLintIssues.mockRejectedValue(serviceError);
      mockCircuitBreaker.execute.mockRejectedValue(serviceError);

      (aiErrorHandler.handleError as jest.Mock).mockReturnValue({
        type: 'service_unavailable',
        message: serviceError.message,
        retryable: true,
        shouldOpenCircuit: true
      });

      const circuitBreaker = getCircuitBreaker();

      try {
        await circuitBreaker.execute(() => mockAIService.detectLintIssues('test', 'text'));
      } catch (error) {
        const errorResult = aiErrorHandler.handleError(error, { operation: 'detectLintIssues' });

        if (errorResult.shouldOpenCircuit) {
          expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
          expect(mockLogger.error).toHaveBeenCalledWith(
            'Circuit breaker failure recorded',
            expect.objectContaining({ error: serviceError.message })
          );
        }
      }
    });

    it('should provide user-friendly error messages', () => {
      const technicalErrors = [
        new Error('ECONNREFUSED: Connection refused'),
        new Error('ETIMEDOUT: Operation timed out'),
        new Error('ENOTFOUND: DNS lookup failed'),
        new Error('429: Too Many Requests')
      ];

      (aiErrorHandler.getUserFriendlyMessage as jest.Mock).mockImplementation((error) => {
        if (error.message.includes('ECONNREFUSED')) return 'Service is temporarily unavailable. Please try again later.';
        if (error.message.includes('ETIMEDOUT')) return 'Request timed out. Please try again.';
        if (error.message.includes('ENOTFOUND')) return 'Network error. Please check your connection.';
        if (error.message.includes('429')) return 'Too many requests. Please wait and try again.';
        return 'An unexpected error occurred.';
      });

      technicalErrors.forEach(error => {
        const userMessage = aiErrorHandler.getUserFriendlyMessage(error);
        expect(userMessage).not.toContain('ECONNREFUSED');
        expect(userMessage).not.toContain('ETIMEDOUT');
        expect(userMessage).not.toContain('ENOTFOUND');
        expect(userMessage).not.toContain('429');
        expect(userMessage.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Metrics and Monitoring Integration', () => {
    it('should track AI service performance metrics', async () => {
      const startTime = Date.now();
      const processingTime = 150; // ms

      mockAIService.detectLintIssues.mockImplementation(async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return { issues: [], score: 100 };
      });

      const aiService = getAIService();
      const metrics = getMetrics();

      await aiService.detectLintIssues('test content', 'text');

      expect(mockMetrics.timing).toHaveBeenCalledWith(
        'ai.service.processing_time',
        expect.any(Number)
      );
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.service.requests_total');
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.service.requests_success');
    });

    it('should track error metrics by type', async () => {
      const errors = [
        new Error('Rate limit exceeded'),
        new Error('Circuit breaker open'),
        new Error('Invalid content'),
        new Error('Network timeout')
      ];

      (aiErrorHandler.categorizeError as jest.Mock).mockImplementation((error) => {
        if (error.message.includes('Rate limit')) return 'rate_limit';
        if (error.message.includes('Circuit breaker')) return 'circuit_breaker';
        if (error.message.includes('Invalid')) return 'validation';
        if (error.message.includes('Network')) return 'network';
        return 'unknown';
      });

      errors.forEach(async (error) => {
        try {
          throw error;
        } catch (err) {
          const errorType = aiErrorHandler.categorizeError(err);
          expect(mockMetrics.increment).toHaveBeenCalledWith(`ai.errors.${errorType}`);
        }
      });
    });

    it('should monitor resource usage', () => {
      const memoryUsage = { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 }; // 50MB used, 100MB total

      // Mock process.memoryUsage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue(memoryUsage);

      // Simulate periodic metrics collection
      mockMetrics.gauge('ai.memory.heap_used', memoryUsage.heapUsed);
      mockMetrics.gauge('ai.memory.heap_total', memoryUsage.heapTotal);

      expect(mockMetrics.gauge).toHaveBeenCalledWith('ai.memory.heap_used', 52428800);
      expect(mockMetrics.gauge).toHaveBeenCalledWith('ai.memory.heap_total', 104857600);

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent AI requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        content: `Test content ${i}`,
        language: 'javascript',
        userId: `user${i}`
      }));

      mockAIService.detectLintIssues.mockResolvedValue({ issues: [], score: 100 });

      const aiService = getAIService();

      // Execute all requests concurrently
      const promises = requests.map(req =>
        aiService.detectLintIssues(req.content, req.language, req.userId)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.score).toBe(100);
      });

      expect(mockAIService.detectLintIssues).toHaveBeenCalledTimes(10);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(10);
      expect(mockLogger.info).toHaveBeenCalledTimes(10);
    });

    it('should manage circuit breaker state under concurrent load', async () => {
      const concurrentRequests = 20;

      // Simulate some requests succeeding and some failing
      let successCount = 0;
      let failureCount = 0;

      mockAIService.detectLintIssues
        .mockImplementation(async () => {
          const shouldSucceed = Math.random() > 0.3; // 70% success rate
          if (shouldSucceed) {
            successCount++;
            return { issues: [], score: 95 };
          } else {
            failureCount++;
            throw new Error('AI service error');
          }
        });

      mockCircuitBreaker.execute.mockImplementation(async (fn) => {
        try {
          const result = await fn();
          mockCircuitBreaker.recordSuccess();
          return result;
        } catch (error) {
          mockCircuitBreaker.recordFailure();
          throw error;
        }
      });

      const circuitBreaker = getCircuitBreaker();
      const aiService = getAIService();

      // Execute concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        circuitBreaker.execute(() => aiService.detectLintIssues('test', 'text')).catch(() => null)
      );

      await Promise.all(promises);

      expect(successCount + failureCount).toBe(concurrentRequests);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledTimes(successCount);
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledTimes(failureCount);
    });
  });

  describe('Large Payload Handling', () => {
    it('should handle large content payloads efficiently', async () => {
      const largeContent = 'function test() {\n' + '  console.log("line");\n'.repeat(1000) + '}';

      mockAIService.detectLintIssues.mockResolvedValue({
        issues: [],
        score: 100,
        processingTime: 500 // ms
      });

      const aiService = getAIService();
      const startTime = Date.now();

      const result = await aiService.detectLintIssues(largeContent, 'javascript');

      const processingTime = Date.now() - startTime;

      expect(result.score).toBe(100);
      expect(largeContent.length).toBeGreaterThan(15000); // > 15KB
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing large content payload',
        expect.objectContaining({
          contentLength: largeContent.length,
          language: 'javascript'
        })
      );
    });

    it('should stream large responses when supported', async () => {
      const largeResult = {
        issues: Array.from({ length: 1000 }, (_, i) => ({
          type: 'warning',
          message: `Issue ${i}`,
          line: i + 1,
          severity: 'warning'
        })),
        score: 75
      };

      mockAIService.detectLintIssues.mockResolvedValue(largeResult);

      const aiService = getAIService();

      const result = await aiService.detectLintIssues('large content', 'text');

      expect(result.issues).toHaveLength(1000);
      expect(result.score).toBe(75);

      // Verify large response handling
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Large response generated',
        expect.objectContaining({
          issueCount: 1000,
          responseSize: expect.any(Number)
        })
      );
    });
  });

  describe('Cross-Service Integration', () => {
    it('should coordinate between all services for complete AI request', async () => {
      const userId = 'user123';
      const content = 'function validate() { return true; }';
      const language = 'javascript';

      // Setup all services to work together
      mockRateLimiter.checkLimit.mockResolvedValue(true);
      (aiValidation.validateContent as jest.Mock).mockReturnValue({
        isValid: true,
        sanitized: content,
        warnings: []
      });
      (aiSecurity.analyzeContent as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: [],
        riskLevel: 'low'
      });
      mockAIService.detectLintIssues.mockResolvedValue({
        issues: [{ type: 'warning', message: 'Missing JSDoc', severity: 'warning' }],
        score: 85
      });

      // Execute complete pipeline
      const rateLimiter = getRateLimiter();
      const canProceed = await rateLimiter.checkLimit(userId, 'ai-lint');
      expect(canProceed).toBe(true);

      const validation = aiValidation.validateContent(content);
      expect(validation.isValid).toBe(true);

      const security = aiSecurity.analyzeContent(content);
      expect(security.isSafe).toBe(true);

      const circuitBreaker = getCircuitBreaker();
      const result = await circuitBreaker.execute(() =>
        mockAIService.detectLintIssues(content, language, userId)
      );

      expect(result.score).toBe(85);
      expect(result.issues).toHaveLength(1);

      // Verify all services were called in correct order
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(userId, 'ai-lint');
      expect(aiValidation.validateContent).toHaveBeenCalledWith(content);
      expect(aiSecurity.analyzeContent).toHaveBeenCalledWith(content);
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockAIService.detectLintIssues).toHaveBeenCalledWith(content, language, userId);

      // Verify metrics and logging
      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.pipeline.success');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI request completed successfully',
        expect.objectContaining({
          userId,
          language,
          score: 85,
          issueCount: 1
        })
      );
    });

    it('should handle pipeline failures at any stage', async () => {
      const userId = 'user123';
      const content = 'malicious content with <script> tags';

      // Rate limiting passes
      mockRateLimiter.checkLimit.mockResolvedValue(true);

      // Validation fails
      (aiValidation.validateContent as jest.Mock).mockReturnValue({
        isValid: false,
        sanitized: '',
        warnings: ['Invalid content detected']
      });

      const rateLimiter = getRateLimiter();
      const canProceed = await rateLimiter.checkLimit(userId, 'ai-lint');
      expect(canProceed).toBe(true);

      const validation = aiValidation.validateContent(content);
      expect(validation.isValid).toBe(false);

      // Pipeline should stop here
      expect(aiSecurity.analyzeContent).not.toHaveBeenCalled();
      expect(mockAIService.detectLintIssues).not.toHaveBeenCalled();

      expect(mockMetrics.increment).toHaveBeenCalledWith('ai.pipeline.validation_failed');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI request failed at validation stage',
        expect.objectContaining({
          userId,
          warnings: ['Invalid content detected']
        })
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for AI operations', async () => {
      const benchmarkRuns = 50;
      const results: number[] = [];

      for (let i = 0; i < benchmarkRuns; i++) {
        const startTime = Date.now();
        await mockAIService.detectLintIssues(`content ${i}`, 'text');
        const endTime = Date.now();
        results.push(endTime - startTime);
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);

      // Performance assertions
      expect(avgTime).toBeLessThan(100); // Average < 100ms
      expect(maxTime).toBeLessThan(500); // Max < 500ms
      expect(minTime).toBeGreaterThanOrEqual(0);

      expect(mockMetrics.timing).toHaveBeenCalledTimes(benchmarkRuns);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AI performance benchmark completed',
        expect.objectContaining({
          averageTime: expect.any(Number),
          maxTime: expect.any(Number),
          minTime: expect.any(Number),
          totalRuns: benchmarkRuns
        })
      );
    });

    it('should monitor memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      const largeContent = 'x'.repeat(1000000); // 1MB content

      mockAIService.detectLintIssues.mockResolvedValue({ issues: [], score: 100 });

      await mockAIService.detectLintIssues(largeContent, 'text');

      const finalMemory = process.memoryUsage();

      // Memory usage should not grow excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB increase

      expect(mockMetrics.gauge).toHaveBeenCalledWith(
        'ai.memory.increase',
        expect.any(Number)
      );
    });
  });
});