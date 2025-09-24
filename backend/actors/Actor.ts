// backend/actors/Actor.ts
// Base Actor class implementing message passing and lifecycle management

import { IActor, Message } from './types';
import { logger } from '../lib/logger';

/**
 * Base Actor class providing core functionality for message passing,
 * lifecycle management, and resilience patterns.
 * Implements agentic design patterns for structured reasoning and task delegation.
 */
export abstract class Actor implements IActor {
  public readonly id: string;
  private mailbox: Message[] = [];
  private isRunning = false;
  private processingPromise: Promise<void> | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Starts the actor's message processing loop
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn(`Actor ${this.id} is already running`);
      return;
    }

    this.isRunning = true;
    this.processingPromise = this.processMessages();
    logger.info(`Actor ${this.id} started`);
  }

  /**
   * Stops the actor and cleans up resources
   */
  public stop(): void {
    this.isRunning = false;
    if (this.processingPromise) {
      this.processingPromise.then(() => {
        logger.info(`Actor ${this.id} stopped`);
      });
    }
  }

  /**
   * Sends a message to this actor (adds to mailbox)
   */
  public send(message: Message): void {
    if (!this.isRunning) {
      logger.warn(`Actor ${this.id} is not running, discarding message`);
      return;
    }

    this.mailbox.push(message);
    logger.debug(`Message sent to actor ${this.id}: ${message.type}`);
  }
  /**
   * Receives a message and processes it
   * Implements the IActor interface
   */
  public async receive(message: Message): Promise<void> {
    await this.handleMessage(message);
  }

  /**
   * Abstract method for handling received messages
   * Subclasses must implement this to define behavior
   */
  protected abstract handleMessage(message: Message): Promise<void>;

  /**
   * Processes messages from the mailbox asynchronously
   */
  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      if (this.mailbox.length > 0) {
        const message = this.mailbox.shift()!;
        try {
          await this.handleMessage(message);
        } catch (error) {
          logger.error(`Error processing message in actor ${this.id}:`, error);
          // Send error response if message has a sender
          if (message.from) {
            this.sendError(message.from, error as Error, message.correlationId);
          }
        }
      } else {
        // Yield control to avoid busy waiting
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  /**
   * Sends an error message to another actor
   */
  protected sendError(to: string, error: Error, correlationId?: string): void {
    const errorMessage: Message = {
      id: `error-${Date.now()}-${Math.random()}`,
      type: 'error',
      from: this.id,
      to,
      payload: { error: error.message },
      timestamp: Date.now(),
      correlationId,
    };
    // Note: In a real system, this would route to the target actor
    // For now, we'll assume a global registry or direct access
    logger.error(`Sending error from ${this.id} to ${to}: ${error.message}`);
  }

  /**
   * Sends a response message to another actor
   */
  protected sendResponse(to: string, result: any, correlationId?: string): void {
    const responseMessage: Message = {
      id: `response-${Date.now()}-${Math.random()}`,
      type: 'response',
      from: this.id,
      to,
      payload: { result },
      timestamp: Date.now(),
      correlationId,
    };
    logger.debug(`Sending response from ${this.id} to ${to}`);
  }
}