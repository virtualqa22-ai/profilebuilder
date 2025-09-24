// backend/actors/mcp.ts
// MCP (Model Context Protocol) implementation for secure agent-to-agent communication

import { Message } from './types';
import { logger } from '../lib/logger';
import * as crypto from 'crypto';

/**
 * MCP Protocol utilities for secure inter-agent communication.
 * Implements message signing, verification, and secure routing.
 */
export class MCPProtocol {
  private static secretKey = process.env.MCP_SECRET_KEY || 'default-mcp-key-change-in-production';

  /**
   * Signs a message for secure transmission
   */
  static signMessage(message: Message): Message {
    const payload = JSON.stringify({
      id: message.id,
      type: message.type,
      from: message.from,
      to: message.to,
      payload: message.payload,
      timestamp: message.timestamp,
      correlationId: message.correlationId,
    });

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    return {
      ...message,
      signature,
    };
  }

  /**
   * Verifies a message signature
   */
  static verifyMessage(message: Message): boolean {
    if (!message.signature) {
      logger.warn('Message missing signature');
      return false;
    }

    const { signature, ...messageWithoutSig } = message;
    const payload = JSON.stringify({
      id: messageWithoutSig.id,
      type: messageWithoutSig.type,
      from: messageWithoutSig.from,
      to: messageWithoutSig.to,
      payload: messageWithoutSig.payload,
      timestamp: messageWithoutSig.timestamp,
      correlationId: messageWithoutSig.correlationId,
    });

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn(`Invalid message signature for message ${message.id}`);
    }

    return isValid;
  }

  /**
   * Validates message integrity and security
   */
  static validateMessage(message: Message): { valid: boolean; reason?: string } {
    // Check required fields
    if (!message.id || !message.type || !message.from || !message.to) {
      return { valid: false, reason: 'Missing required message fields' };
    }

    // Check timestamp (within reasonable time window)
    const now = Date.now();
    const messageTime = message.timestamp;
    const timeDiff = Math.abs(now - messageTime);
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxAge) {
      return { valid: false, reason: 'Message timestamp too old' };
    }

    // Verify signature
    if (!this.verifyMessage(message)) {
      return { valid: false, reason: 'Invalid message signature' };
    }

    // Validate payload based on message type
    const payloadValidation = this.validatePayload(message);
    if (!payloadValidation.valid) {
      return payloadValidation;
    }

    return { valid: true };
  }

  /**
   * Validates message payload based on type
   */
  private static validatePayload(message: Message): { valid: boolean; reason?: string } {
    switch (message.type) {
      case 'task':
        if (!message.payload.taskType) {
          return { valid: false, reason: 'Task message missing taskType' };
        }
        break;
      case 'response':
        // Response payload is flexible
        break;
      case 'error':
        if (!message.payload.error) {
          return { valid: false, reason: 'Error message missing error field' };
        }
        break;
      default:
        return { valid: false, reason: `Unknown message type: ${message.type}` };
    }

    return { valid: true };
  }

  /**
   * Creates a secure task message
   */
  static createTaskMessage(
    from: string,
    to: string,
    taskType: string,
    data: any,
    correlationId?: string
  ): Message {
    const message: Message = {
      id: `task-${Date.now()}-${Math.random()}`,
      type: 'task',
      from,
      to,
      payload: { taskType, data },
      timestamp: Date.now(),
      correlationId,
    };

    return this.signMessage(message);
  }

  /**
   * Creates a secure response message
   */
  static createResponseMessage(
    from: string,
    to: string,
    result: any,
    correlationId?: string
  ): Message {
    const message: Message = {
      id: `response-${Date.now()}-${Math.random()}`,
      type: 'response',
      from,
      to,
      payload: { result },
      timestamp: Date.now(),
      correlationId,
    };

    return this.signMessage(message);
  }

  /**
   * Creates a secure error message
   */
  static createErrorMessage(
    from: string,
    to: string,
    error: string,
    code: string,
    correlationId?: string
  ): Message {
    const message: Message = {
      id: `error-${Date.now()}-${Math.random()}`,
      type: 'error',
      from,
      to,
      payload: { error, code },
      timestamp: Date.now(),
      correlationId,
    };

    return this.signMessage(message);
  }

  /**
   * Sanitizes message for logging (removes sensitive data)
   */
  static sanitizeForLogging(message: Message): Partial<Message> {
    const sanitized = { ...message };
    // Remove or mask sensitive payload data if needed
    // For now, just remove signature for cleaner logs
    delete sanitized.signature;
    return sanitized;
  }
}

/**
 * MCP Router for secure message routing between agents
 */
export class MCPRouter {
  private agents: Map<string, any> = new Map(); // Would be IActor in real implementation

  /**
   * Registers an agent with the router
   */
  registerAgent(agentId: string, agent: any): void {
    this.agents.set(agentId, agent);
    logger.info(`Agent ${agentId} registered with MCP Router`);
  }

  /**
   * Routes a message to the target agent
   */
  async routeMessage(message: Message): Promise<void> {
    // Validate message
    const validation = MCPProtocol.validateMessage(message);
    if (!validation.valid) {
      logger.error(`Invalid message rejected: ${validation.reason}`, MCPProtocol.sanitizeForLogging(message));
      throw new Error(`Message validation failed: ${validation.reason}`);
    }

    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      logger.error(`No agent found for message target: ${message.to}`);
      throw new Error(`Agent ${message.to} not found`);
    }

    logger.debug(`Routing message ${message.id} from ${message.from} to ${message.to}`);

    try {
      await targetAgent.receive(message);
    } catch (error) {
      logger.error(`Failed to deliver message ${message.id} to ${message.to}:`, error);
      throw error;
    }
  }

  /**
   * Gets registered agent IDs
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}