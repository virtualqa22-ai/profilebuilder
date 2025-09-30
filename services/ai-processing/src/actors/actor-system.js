// Simple Actor System implementation for message-based processing
// Provides asynchronous message passing between components

const { v4: uuidv4 } = require('uuid');
const { ACTOR_MESSAGE_TYPES } = require('../utils/constants');
const { info: logInfo, error: logError } = require('../utils/logger');

/**
 * Actor System class for handling message-based communication
 * Implements a simple actor model for processing AI requests
 */
class ActorSystem {
  constructor() {
    this.actors = new Map();
    this.messageQueue = [];
    this.processing = false;
    this.messageHandlers = new Map();
    this.correlationIds = new Map();

    // Register default message handlers
    this._registerDefaultHandlers();
  }

  /**
   * Register a message handler for a specific message type
   * @param {string} messageType - The message type to handle
   * @param {Function} handler - The handler function
   */
  registerHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
    logInfo(`Registered handler for message type: ${messageType}`);
  }

  /**
   * Send a message to the actor system
   * @param {Object} message - The message to send
   * @returns {Promise} - Promise that resolves with the response
   */
  async send(message) {
    const correlationId = message.correlationId || uuidv4();
    const taskId = uuidv4();

    const enrichedMessage = {
      ...message,
      correlationId,
      taskId,
      timestamp: new Date().toISOString(),
    };

    logInfo('Message sent to actor system', {
      messageType: message.type,
      correlationId,
      taskId,
    });

    // Store correlation ID for response tracking
    this.correlationIds.set(correlationId, { resolve: null, reject: null });

    // Create promise for the response
    const responsePromise = new Promise((resolve, reject) => {
      this.correlationIds.set(correlationId, { resolve, reject });
    });

    // Add to processing queue
    this.messageQueue.push(enrichedMessage);
    this._processQueue();

    // Set timeout for response
    setTimeout(() => {
      if (this.correlationIds.has(correlationId)) {
        const { reject } = this.correlationIds.get(correlationId);
        this.correlationIds.delete(correlationId);
        reject(new Error('Actor system timeout'));
      }
    }, 30000); // 30 second timeout

    return responsePromise;
  }

  /**
   * Process messages in the queue
   * @private
   */
  async _processQueue() {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this._handleMessage(message);
    }

    this.processing = false;
  }

  /**
   * Handle a single message
   * @param {Object} message - The message to handle
   * @private
   */
  async _handleMessage(message) {
    try {
      const handler = this.messageHandlers.get(message.type);

      if (!handler) {
        throw new Error(`No handler registered for message type: ${message.type}`);
      }

      logInfo('Processing message', {
        messageType: message.type,
        correlationId: message.correlationId,
        taskId: message.taskId,
      });

      const result = await handler(message);

      // Send response back
      this._sendResponse(message.correlationId, {
        taskId: message.taskId,
        status: 'completed',
        result,
        correlationId: message.correlationId,
      });

    } catch (error) {
      logError('Message processing failed', {
        messageType: message.type,
        correlationId: message.correlationId,
        taskId: message.taskId,
        error: error.message,
      });

      this._sendResponse(message.correlationId, {
        taskId: message.taskId,
        status: 'failed',
        error: error.message,
        correlationId: message.correlationId,
      });
    }
  }

  /**
   * Send response back to the waiting promise
   * @param {string} correlationId - The correlation ID
   * @param {Object} response - The response data
   * @private
   */
  _sendResponse(correlationId, response) {
    const promiseHandlers = this.correlationIds.get(correlationId);

    if (promiseHandlers) {
      const { resolve, reject } = promiseHandlers;

      if (response.status === 'completed') {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Processing failed'));
      }

      this.correlationIds.delete(correlationId);
    }
  }

  /**
   * Register default message handlers
   * @private
   */
  _registerDefaultHandlers() {
    // Default handlers for AI processing messages
    this.registerHandler('PROCESS_AI_REQUEST', async (message) => {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
      return {
        result: `Processed ${message.payload.taskType} for text: ${message.payload.text.substring(0, 50)}...`,
        confidence: 0.95,
      };
    });

    this.registerHandler('VALIDATE_CONTENT', async (message) => {
      // Simulate content validation
      return { valid: true, validated: message.payload.data };
    });

    this.registerHandler('GENERATE_SUGGESTIONS', async (message) => {
      // Simulate suggestion generation
      return { suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'] };
    });

    this.registerHandler('ANALYZE_RESUME', async (message) => {
      // Simulate resume analysis
      return {
        analysis: {
          skills: ['JavaScript', 'Node.js', 'React'],
          experience: '5 years',
          score: 85,
        },
      };
    });
  }

  /**
   * Get system statistics
   * @returns {Object} - System stats
   */
  get stats() {
    return {
      activeMessages: this.messageQueue.length,
      registeredHandlers: this.messageHandlers.size,
      pendingCorrelations: this.correlationIds.size,
      processing: this.processing,
    };
  }
}

// Create singleton instance
const actorSystem = new ActorSystem();

module.exports = {
  ActorSystem,
  actorSystem,
};