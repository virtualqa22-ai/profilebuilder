/**
 * AI Service Module
 *
 * Provides AI-powered content processing including:
 * - Content rewriting
 * - Grammar and style suggestions
 * - Linting detections
 *
 * Integrates with security, caching, and metrics modules for robust operation.
 */

import { sanitizePrompt, validateAIContent, trackAIPerformance, logAISecurityEvent } from './aiSecurity';
import { getCacheManager } from './cacheManager';
import { trackAiMetrics } from './metrics';
import { globalLogger } from './logger';
import { CircuitBreaker } from './circuitBreaker';

/**
 * AI Service Configuration
 */
interface AIServiceConfig {
  openaiApiKey: string;
  model: string;
  maxRetries: number;
  timeout: number;
  cacheTTL: number;
}

/**
 * Default AI service configuration
 */
const defaultConfig: AIServiceConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  cacheTTL: 3600, // 1 hour
};


/**
 * Rate limiter for AI requests (10 req/min per user)
 */
class RateLimiter {
  private requests = new Map<string, number[]>();

  /**
   * Check if request is allowed for user
   */
  isAllowed(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);

    if (validRequests.length >= 10) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return true;
  }

  /**
   * Clean up old entries periodically
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - 60000;

    for (const [userId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validRequests);
      }
    }
  }
}

/**
 * AI Service class
 */
export class AIService {
  private config: AIServiceConfig;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private cacheManager = getCacheManager();

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter();

    // Clean up rate limiter every 5 minutes
    setInterval(() => this.rateLimiter.cleanup(), 300000);
  }

  /**
   * Rewrite content using AI
   */
  async rewriteContent(content: string, style?: string, userId?: string): Promise<string> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (userId && !this.rateLimiter.isAllowed(userId)) {
        logAISecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          details: 'Rate limit exceeded for AI rewrite',
          userId,
          timestamp: new Date(),
        });
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Check cache first
      const cacheKey = `ai:rewrite:${this.hashContent(content)}:${style || 'default'}`;
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) {
        trackAiMetrics('rewrite', this.config.model, Date.now() - startTime);
        return cached;
      }

      // Sanitize input
      const sanitizedContent = sanitizePrompt(content);
      if (!sanitizedContent) {
        throw new Error('Content contains unsafe content');
      }

      // Create prompt
      const prompt = this.createRewritePrompt(sanitizedContent, style);

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(() =>
        this.callOpenAI(prompt, 'rewrite')
      );

      // Validate output
      const validation = validateAIContent(result);
      if (!validation.safe) {
        logAISecurityEvent({
          type: 'unsafe_content',
          severity: 'high',
          details: `AI generated unsafe content: ${validation.issues.join(', ')}`,
          userId,
          timestamp: new Date(),
        });
        throw new Error('Generated content failed safety validation');
      }

      // Cache result
      await this.cacheManager.set(cacheKey, result, this.config.cacheTTL);

      // Track metrics
      trackAiMetrics('rewrite', this.config.model, Date.now() - startTime);
      trackAIPerformance('rewrite', this.config.model, Date.now() - startTime, true);

      return result;
    } catch (error) {
      trackAIPerformance('rewrite', this.config.model, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get grammar and style suggestions
   */
  async getSuggestions(content: string, userId?: string): Promise<{
    grammar: string[];
    style: string[];
    suggestions: string[];
  }> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (userId && !this.rateLimiter.isAllowed(userId)) {
        logAISecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          details: 'Rate limit exceeded for AI suggestions',
          userId,
          timestamp: new Date(),
        });
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Check cache
      const cacheKey = `ai:suggestions:${this.hashContent(content)}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        trackAiMetrics('suggestions', this.config.model, Date.now() - startTime);
        return cached;
      }

      // Sanitize input
      const sanitizedContent = sanitizePrompt(content);
      if (!sanitizedContent) {
        throw new Error('Content contains unsafe content');
      }

      // Create prompt
      const prompt = this.createSuggestionsPrompt(sanitizedContent);

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(() =>
        this.callOpenAI(prompt, 'suggestions')
      );

      // Parse and validate result
      const parsed = this.parseSuggestionsResult(result);

      // Cache result
      await this.cacheManager.set(cacheKey, parsed, this.config.cacheTTL);

      // Track metrics
      trackAiMetrics('suggestions', this.config.model, Date.now() - startTime);
      trackAIPerformance('suggestions', this.config.model, Date.now() - startTime, true);

      return parsed;
    } catch (error) {
      trackAIPerformance('suggestions', this.config.model, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Detect linting issues in content
   */
  async detectLintIssues(content: string, language: string = 'text', userId?: string): Promise<{
    issues: Array<{
      type: string;
      message: string;
      line?: number;
      column?: number;
      severity: 'error' | 'warning' | 'info';
    }>;
    score: number;
  }> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (userId && !this.rateLimiter.isAllowed(userId)) {
        logAISecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          details: 'Rate limit exceeded for AI lint',
          userId,
          timestamp: new Date(),
        });
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Check cache
      const cacheKey = `ai:lint:${this.hashContent(content)}:${language}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        trackAiMetrics('lint', this.config.model, Date.now() - startTime);
        return cached;
      }

      // Sanitize input
      const sanitizedContent = sanitizePrompt(content);
      if (!sanitizedContent) {
        throw new Error('Content contains unsafe content');
      }

      // Create prompt
      const prompt = this.createLintPrompt(sanitizedContent, language);

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(() =>
        this.callOpenAI(prompt, 'lint')
      );

      // Parse result
      const parsed = this.parseLintResult(result);

      // Cache result
      await this.cacheManager.set(cacheKey, parsed, this.config.cacheTTL);

      // Track metrics
      trackAiMetrics('lint', this.config.model, Date.now() - startTime);
      trackAIPerformance('lint', this.config.model, Date.now() - startTime, true);

      return parsed;
    } catch (error) {
      trackAIPerformance('lint', this.config.model, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Call OpenAI API (circuit breaker handles retries)
   */
  private async callOpenAI(prompt: string, operation: string): Promise<string> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Create rewrite prompt
   */
  private createRewritePrompt(content: string, style?: string): string {
    const styleInstruction = style ? ` in a ${style} style` : '';
    return `Rewrite the following content${styleInstruction}. Make it more professional, clear, and engaging while preserving the original meaning:

Content: ${content}

Rewritten version:`;
  }

  /**
   * Create suggestions prompt
   */
  private createSuggestionsPrompt(content: string): string {
    return `Analyze the following text and provide suggestions for grammar, style, and overall improvements. Format your response as JSON with the following structure:
{
  "grammar": ["list of grammar issues"],
  "style": ["list of style suggestions"],
  "suggestions": ["general improvement suggestions"]
}

Text: ${content}

Response:`;
  }

  /**
   * Create lint prompt
   */
  private createLintPrompt(content: string, language: string): string {
    return `Analyze the following ${language} content for potential issues, errors, and improvements. Provide a detailed analysis including specific line numbers where possible. Format your response as JSON with the following structure:
{
  "issues": [
    {
      "type": "error|warning|info",
      "message": "description of the issue",
      "line": 1,
      "column": 1,
      "severity": "error|warning|info"
    }
  ],
  "score": 85
}

Content: ${content}

Response:`;
  }

  /**
   * Parse suggestions result
   */
  private parseSuggestionsResult(result: string): {
    grammar: string[];
    style: string[];
    suggestions: string[];
  } {
    try {
      const parsed = JSON.parse(result);
      return {
        grammar: Array.isArray(parsed.grammar) ? parsed.grammar : [],
        style: Array.isArray(parsed.style) ? parsed.style : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error) {
      globalLogger.warn('Failed to parse AI suggestions result:', error);
      return { grammar: [], style: [], suggestions: [] };
    }
  }

  /**
   * Parse lint result
   */
  private parseLintResult(result: string): {
    issues: Array<{
      type: string;
      message: string;
      line?: number;
      column?: number;
      severity: 'error' | 'warning' | 'info';
    }>;
    score: number;
  } {
    try {
      const parsed = JSON.parse(result);
      return {
        issues: Array.isArray(parsed.issues) ? parsed.issues.map((issue: any) => ({
          type: issue.type || 'unknown',
          message: issue.message || '',
          line: issue.line,
          column: issue.column,
          severity: issue.severity || 'info',
        })) : [],
        score: typeof parsed.score === 'number' ? parsed.score : 0,
      };
    } catch (error) {
      globalLogger.warn('Failed to parse AI lint result:', error);
      return { issues: [], score: 0 };
    }
  }

  /**
   * Simple hash function for cache keys
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      cacheHealthy: true, // Cache manager handles its own health
      rateLimiterActive: true,
    };
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

/**
 * Get AI service instance
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}