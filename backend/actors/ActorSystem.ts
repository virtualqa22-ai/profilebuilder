// backend/actors/ActorSystem.ts
// Actor System initialization and management

import { Supervisor } from './Supervisor';
import { AiRewriteWorker } from './AiRewriteWorker';
import { PdfGenerationWorker } from './PdfGenerationWorker';
import { MCPRouter } from './mcp';
import { logger } from '../lib/logger';

/**
 * Actor System for managing the hierarchical supervisor-worker pattern.
 * Initializes and coordinates all actors with MCP protocols.
 */
export class ActorSystem {
  private supervisor: Supervisor;
  private router: MCPRouter;
  private isInitialized = false;

  constructor() {
    this.supervisor = new Supervisor('supervisor-main', 'restart', 5);
    this.router = new MCPRouter();
  }

  /**
   * Initializes the actor system with workers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Actor system already initialized');
      return;
    }

    try {
      logger.info('Initializing actor system...');

      // Create and register workers
      const aiWorker = new AiRewriteWorker('ai-rewrite-worker-1', 'supervisor-main');
      const pdfWorker = new PdfGenerationWorker('pdf-generation-worker-1', 'supervisor-main');

      // Register workers with supervisor
      this.supervisor.registerWorker(aiWorker);
      this.supervisor.registerWorker(pdfWorker);

      // Register all actors with MCP router
      this.router.registerAgent('supervisor-main', this.supervisor);
      this.router.registerAgent('ai-rewrite-worker-1', aiWorker);
      this.router.registerAgent('pdf-generation-worker-1', pdfWorker);

      // Start the supervisor
      this.supervisor.start();

      this.isInitialized = true;
      logger.info('Actor system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize actor system:', error);
      throw error;
    }
  }

  /**
   * Shuts down the actor system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Shutting down actor system...');
      this.supervisor.stop();
      this.isInitialized = false;
      logger.info('Actor system shut down successfully');
    } catch (error) {
      logger.error('Error during actor system shutdown:', error);
      throw error;
    }
  }

  /**
   * Gets the supervisor instance
   */
  getSupervisor(): Supervisor {
    return this.supervisor;
  }

  /**
   * Gets the MCP router instance
   */
  getRouter(): MCPRouter {
    return this.router;
  }

  /**
   * Gets system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    supervisor: any;
    registeredAgents: string[];
  } {
    return {
      initialized: this.isInitialized,
      supervisor: this.supervisor.getHealthStatus(),
      registeredAgents: this.router.getRegisteredAgents(),
    };
  }
}

// Singleton instance
let actorSystemInstance: ActorSystem | null = null;

/**
 * Gets the actor system instance
 */
export function getActorSystem(): ActorSystem {
  if (!actorSystemInstance) {
    actorSystemInstance = new ActorSystem();
  }
  return actorSystemInstance;
}

/**
 * Initializes the global actor system
 */
export async function initializeActorSystem(): Promise<void> {
  const system = getActorSystem();
  await system.initialize();
}

/**
 * Shuts down the global actor system
 */
export async function shutdownActorSystem(): Promise<void> {
  if (actorSystemInstance) {
    await actorSystemInstance.shutdown();
    actorSystemInstance = null;
  }
}