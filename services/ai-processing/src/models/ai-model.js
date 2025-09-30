// AI Model Integration module
// Handles communication with external AI services using axios with retry logic

const axios = require('axios');
const axiosRetry = require('axios-retry');
const { VALIDATION_RULES, RETRY_CONFIG, API_ENDPOINTS, MESSAGES } = require('../utils/constants');
const { info: logInfo, error: logError } = require('../utils/logger');

/**
 * AI Service class for handling AI model interactions
 * Provides methods for text processing, task execution, and validation
 */
class AIService {
  constructor() {
    // Configure axios with retry logic
    this.client = axios.create({
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY || 'test-key'}`,
      },
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: RETRY_CONFIG.RETRIES,
      retryDelay: (retryCount) => {
        return Math.pow(2, retryCount) * RETRY_CONFIG.RETRY_DELAY;
      },
      retryCondition: RETRY_CONFIG.RETRY_CONDITION,
    });
  }

  /**
   * Process text with AI model
   * @param {string} text - The text to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - AI processing result
   */
  async processText(text, options = {}) {
    // Validate input
    this._validateTextInput(text);
    this._validateOptions(options);

    const payload = {
      text,
      ...options,
    };

    try {
      logInfo('Starting AI text processing', {
        textLength: text.length,
        task: options.task || 'general',
      });

      const response = await this.client.post(API_ENDPOINTS.AI_PROCESS, payload);

      logInfo('AI text processing completed', {
        confidence: response.data.confidence,
        resultLength: response.data.result?.length || 0,
      });

      return response.data;
    } catch (error) {
      logError('AI text processing failed', {
        error: error.message,
        textLength: text.length,
        task: options.task,
      });
      throw new Error(`${MESSAGES.ERRORS.AI_PROCESSING_FAILED}: ${error.message}`);
    }
  }

  /**
   * Process a specific AI task
   * @param {string} text - The text to process
   * @param {string} task - The task type
   * @returns {Promise<Object>} - Task processing result
   */
  async processTask(text, task) {
    if (!VALIDATION_RULES.VALID_TASKS.includes(task)) {
      throw new Error(MESSAGES.ERRORS.INVALID_TASK);
    }

    return this.processText(text, { task });
  }

  /**
   * Process text with circuit breaker protection
   * @param {string} text - The text to process
   * @returns {Promise<Object>} - Processing result
   */
  async processWithCircuitBreaker(text) {
    const { aiCircuitBreaker } = require('../utils/circuit-breaker');

    if (!aiCircuitBreaker.canExecute()) {
      throw new Error(MESSAGES.ERRORS.CIRCUIT_BREAKER_OPEN);
    }

    try {
      const result = await aiCircuitBreaker.fire(async () => {
        return await this.processText(text);
      });

      aiCircuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      aiCircuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Process text with logging
   * @param {string} text - The text to process
   * @param {string} correlationId - Correlation ID for tracing
   * @returns {Promise<Object>} - Processing result
   */
  async processWithLogging(text, correlationId) {
    logInfo('AI processing started', {
      textLength: text.length,
      correlationId,
    });

    try {
      const result = await this.processText(text);

      logInfo('AI processing completed', {
        correlationId,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logError('AI processing failed', {
        correlationId,
        error: error.message,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Process text via actor system
   * @param {string} text - The text to process
   * @param {string} taskType - The task type
   * @returns {Promise<Object>} - Processing result
   */
  async processViaActor(text, taskType) {
    const { actorSystem } = require('../actors/actor-system');

    const message = {
      type: 'PROCESS_AI_REQUEST',
      payload: { text, taskType },
      correlationId: `corr-${Date.now()}`,
    };

    try {
      return await actorSystem.send(message);
    } catch (error) {
      throw new Error(`${MESSAGES.ERRORS.ACTOR_PROCESSING_FAILED}: ${error.message}`);
    }
  }

  /**
   * Send message via actor system
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @returns {Promise<Object>} - Response
   */
  async sendMessage(type, payload) {
    const { actorSystem } = require('../actors/actor-system');

    const message = {
      type,
      payload,
      correlationId: `msg-${Date.now()}`,
    };

    return await actorSystem.send(message);
  }

  /**
   * Validate text input
   * @param {string} text - Text to validate
   * @private
   */
  _validateTextInput(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error(MESSAGES.ERRORS.INVALID_TEXT);
    }

    if (text.length > VALIDATION_RULES.MAX_TEXT_LENGTH) {
      throw new Error(MESSAGES.ERRORS.TEXT_TOO_LONG);
    }
  }

  /**
   * Validate processing options
   * @param {Object} options - Options to validate
   * @private
   */
  _validateOptions(options) {
    if (options.maxTokens !== undefined) {
      if (options.maxTokens < VALIDATION_RULES.MIN_TOKENS ||
          options.maxTokens > VALIDATION_RULES.MAX_TOKENS) {
        throw new Error(MESSAGES.ERRORS.MAX_TOKENS_EXCEEDED);
      }
    }
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = {
  AIService,
  aiService,
};