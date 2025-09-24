// backend/actors/Worker.ts
// Base Worker actor class for handling specific tasks

import { Actor } from './Actor';
import { Message, TaskMessage } from './types';
import { logger } from '../lib/logger';

/**
 * Base Worker actor class that handles specific task types.
 * Subclasses implement the actual task execution logic.
 */
export abstract class Worker extends Actor {
  protected supervisorId: string;

  constructor(id: string, supervisorId: string) {
    super(id);
    this.supervisorId = supervisorId;
  }

  /**
   * Handles incoming messages, primarily tasks
   */
  protected async handleMessage(message: Message): Promise<void> {
    logger.debug(`Worker ${this.id} received message: ${message.type}`);

    switch (message.type) {
      case 'task':
        await this.handleTask(message as TaskMessage);
        break;
      default:
        logger.warn(`Worker ${this.id} received unknown message type: ${message.type}`);
    }
  }

  /**
   * Handles task execution with resilience and error handling
   */
  private async handleTask(taskMessage: TaskMessage): Promise<void> {
    const { taskType, data, correlationId } = taskMessage;

    try {
      logger.info(`Worker ${this.id} executing task: ${taskType}`);

      // Execute the task (implemented by subclasses)
      const result = await this.executeTask(taskType, data);

      // Send success response back to supervisor
      this.sendResponse(this.supervisorId, result, correlationId);

      logger.info(`Worker ${this.id} completed task: ${taskType}`);
    } catch (error) {
      logger.error(`Worker ${this.id} failed task ${taskType}:`, error);

      // Send error response back to supervisor
      this.sendError(this.supervisorId, error as Error, correlationId);
    }
  }

  /**
   * Abstract method for task execution - implemented by subclasses
   */
  protected abstract executeTask(taskType: string, data: any): Promise<any>;
}