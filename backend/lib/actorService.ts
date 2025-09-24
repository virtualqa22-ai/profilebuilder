// backend/lib/actorService.ts
// Actor Service for integrating actor system with existing backend logic

import { getActorSystem, initializeActorSystem, shutdownActorSystem } from '../actors/ActorSystem';
import { MCPProtocol } from '../actors/mcp';
import { logger } from './logger';

/**
 * Actor Service providing high-level interface for task delegation.
 * Integrates actor system with existing backend APIs without bypassing them.
 */
export class ActorService {
  private actorSystem = getActorSystem();

  /**
   * Initializes the actor service
   */
  async initialize(): Promise<void> {
    await initializeActorSystem();
  }

  /**
   * Shuts down the actor service
   */
  async shutdown(): Promise<void> {
    await shutdownActorSystem();
  }

  /**
   * Delegates AI rewrite task to actor system
   */
  async delegateAiRewrite(text: string, options: { context?: string; userId?: string; style?: string } = {}): Promise<any> {
    const correlationId = `ai-rewrite-${Date.now()}-${Math.random()}`;

    try {
      logger.info(`Delegating AI rewrite task with correlation ID: ${correlationId}`);

      const supervisor = this.actorSystem.getSupervisor();
      const taskMessage = MCPProtocol.createTaskMessage(
        'api-service', // from
        'supervisor-main', // to
        'ai-rewrite',
        { text, ...options },
        correlationId
      );

      // Send task to supervisor (simplified - in real implementation would handle async response)
      supervisor.receive(taskMessage);

      // For now, return a placeholder response
      // In production, would implement proper async response handling
      return {
        status: 'delegated',
        correlationId,
        message: 'AI rewrite task delegated to actor system',
      };
    } catch (error) {
      logger.error(`Failed to delegate AI rewrite task:`, error);
      throw error;
    }
  }

  /**
   * Delegates PDF generation task to actor system
   */
  async delegatePdfGeneration(resumeData: any, options: { userId?: string } = {}): Promise<any> {
    const correlationId = `pdf-gen-${Date.now()}-${Math.random()}`;

    try {
      logger.info(`Delegating PDF generation task with correlation ID: ${correlationId}`);

      const supervisor = this.actorSystem.getSupervisor();
      const taskMessage = MCPProtocol.createTaskMessage(
        'api-service',
        'supervisor-main',
        'pdf-generation',
        { resumeData, ...options },
        correlationId
      );

      supervisor.receive(taskMessage);

      return {
        status: 'delegated',
        correlationId,
        message: 'PDF generation task delegated to actor system',
      };
    } catch (error) {
      logger.error(`Failed to delegate PDF generation task:`, error);
      throw error;
    }
  }

  /**
   * Gets actor system health status
   */
  getHealthStatus(): any {
    return this.actorSystem.getHealthStatus();
  }

  /**
   * Gets MCP router status
   */
  getRouterStatus(): any {
    const router = this.actorSystem.getRouter();
    return {
      registeredAgents: router.getRegisteredAgents(),
    };
  }
}

// Singleton instance
let actorServiceInstance: ActorService | null = null;

/**
 * Gets the actor service instance
 */
export function getActorService(): ActorService {
  if (!actorServiceInstance) {
    actorServiceInstance = new ActorService();
  }
  return actorServiceInstance;
}

/**
 * Initializes the global actor service
 */
export async function initializeActorService(): Promise<void> {
  const service = getActorService();
  await service.initialize();
}

/**
 * Shuts down the global actor service
 */
export async function shutdownActorService(): Promise<void> {
  if (actorServiceInstance) {
    await actorServiceInstance.shutdown();
    actorServiceInstance = null;
  }
}