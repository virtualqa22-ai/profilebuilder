// backend/actors/Supervisor.ts
// Supervisor actor implementing hierarchical supervisor-worker pattern

import { Actor } from './Actor';
import { IActor, Message, TaskMessage, SupervisorStrategy, CircuitState } from './types';
import { logger } from '../lib/logger';

/**
 * Supervisor actor that orchestrates task delegation to worker actors.
 * Implements hierarchical supervisor-worker pattern with failure handling strategies.
 */
export class Supervisor extends Actor {
  private workers: Map<string, IActor> = new Map();
  private strategy: SupervisorStrategy;
  private failureCount: Map<string, number> = new Map();
  private totalFailures = 0;
  private circuitBreakerThreshold: number;
  private circuitState: CircuitState = 'closed';

  constructor(
    id: string,
    strategy: SupervisorStrategy = 'restart',
    circuitBreakerThreshold: number = 5
  ) {
    super(id);
    this.strategy = strategy;
    this.circuitBreakerThreshold = circuitBreakerThreshold;
  }

  /**
   * Registers a worker actor with the supervisor
   */
  public registerWorker(worker: IActor): void {
    this.workers.set(worker.id, worker);
    worker.start();
    logger.info(`Worker ${worker.id} registered with supervisor ${this.id}`);
  }

  /**
   * Unregisters a worker actor
   */
  public unregisterWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.stop();
      this.workers.delete(workerId);
      logger.info(`Worker ${workerId} unregistered from supervisor ${this.id}`);
    }
  }

  /**
   * Handles incoming messages, primarily task delegation
   */
  protected async handleMessage(message: Message): Promise<void> {
    logger.debug(`Supervisor ${this.id} received message: ${message.type}`);

    switch (message.type) {
      case 'task':
        await this.handleTask(message as TaskMessage);
        break;
      case 'error':
        await this.handleWorkerError(message);
        break;
      case 'response':
        // Forward responses to the original requester
        this.forwardResponse(message);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Delegates tasks to appropriate worker actors
   */
  private async handleTask(taskMessage: TaskMessage): Promise<void> {
    const { taskType, data } = taskMessage;

    // Check circuit breaker
    if (this.circuitState === 'open') {
      logger.warn(`Circuit breaker open, rejecting task ${taskType}`);
      this.sendError(taskMessage.from, new Error('Service temporarily unavailable'), taskMessage.correlationId);
      return;
    }

    // Find available worker for the task type
    const worker = this.findWorkerForTask(taskType);
    if (!worker) {
      logger.error(`No worker available for task type: ${taskType}`);
      this.sendError(taskMessage.from, new Error(`No worker available for ${taskType}`), taskMessage.correlationId);
      return;
    }

    try {
      // Delegate task to worker
      const workerMessage: TaskMessage = {
        ...taskMessage,
        to: worker.id,
      };
      worker.receive(workerMessage);
      logger.info(`Task ${taskType} delegated to worker ${worker.id}`);
    } catch (error) {
      logger.error(`Failed to delegate task to worker ${worker.id}:`, error);
      this.handleWorkerFailure(worker.id, error as Error);
    }
  }

  /**
   * Handles errors reported by worker actors
   */
  private async handleWorkerError(errorMessage: Message): Promise<void> {
    const workerId = errorMessage.from;
    const error = new Error(errorMessage.payload.error);

    logger.error(`Worker ${workerId} reported error:`, error);
    this.handleWorkerFailure(workerId, error);
  }

  /**
   * Applies supervisor strategy when a worker fails
   */
  private handleWorkerFailure(workerId: string, error: Error): void {
    const currentFailures = this.failureCount.get(workerId) || 0;
    this.failureCount.set(workerId, currentFailures + 1);

    // Update circuit breaker
    this.totalFailures++;
    if (this.totalFailures >= this.circuitBreakerThreshold) {
      this.circuitState = 'open';
      logger.warn(`Circuit breaker opened due to ${this.totalFailures} total failures`);
    }

    switch (this.strategy) {
      case 'restart':
        this.restartWorker(workerId);
        break;
      case 'escalate':
        this.escalateFailure(workerId, error);
        break;
      case 'ignore':
        logger.warn(`Ignoring failure for worker ${workerId}`);
        break;
      default:
        logger.error(`Unknown supervisor strategy: ${this.strategy}`);
    }
  }

  /**
   * Restarts a failed worker
   */
  private restartWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      logger.info(`Restarting worker ${workerId}`);
      worker.stop();
      // In a real implementation, you might recreate the worker or reset its state
      worker.start();
    }
  }

  /**
   * Escalates failure to higher level (e.g., human intervention)
   */
  private escalateFailure(workerId: string, error: Error): void {
    logger.error(`Escalating failure for worker ${workerId}:`, error);
    // In a real system, this might send alerts or notifications
    // For now, just log and potentially shut down the worker
    this.unregisterWorker(workerId);
  }

  /**
   * Finds an appropriate worker for a given task type
   */
  private findWorkerForTask(taskType: string): IActor | null {
    // Simple round-robin or load balancing could be implemented here
    for (const [id, worker] of this.workers) {
      if (id.includes(taskType)) {
        return worker;
      }
    }
    // Return first available worker if no specific match
    return this.workers.values().next().value || null;
  }

  /**
   * Forwards responses from workers to the original requester
   */
  private forwardResponse(responseMessage: Message): void {
    // In a real system, maintain a correlation map
    logger.debug(`Forwarding response from ${responseMessage.from} to ${responseMessage.to}`);
  }

  /**
   * Gets the current health status of the supervisor
   */
  public getHealthStatus(): { workers: number; failures: number; circuitState: CircuitState } {
    return {
      workers: this.workers.size,
      failures: this.totalFailures,
      circuitState: this.circuitState,
    };
  }
}