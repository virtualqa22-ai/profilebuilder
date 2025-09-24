// backend/actors/AiRewriteWorker.ts
// Worker actor for AI rewrite tasks

import { Worker } from './Worker';
import { getAIService } from '../lib/aiService';
import { logger } from '../lib/logger';

/**
 * Worker actor specialized in AI rewrite tasks.
 * Integrates with existing AIService for text rewriting functionality.
 */
export class AiRewriteWorker extends Worker {
  private aiService = getAIService();

  constructor(id: string, supervisorId: string) {
    super(id, supervisorId);
  }

  /**
   * Executes AI rewrite tasks
   */
  protected async executeTask(taskType: string, data: any): Promise<any> {
    if (taskType !== 'ai-rewrite') {
      throw new Error(`AiRewriteWorker cannot handle task type: ${taskType}`);
    }

    const { text, style, userId } = data;

    if (!text) {
      throw new Error('Text is required for AI rewrite task');
    }

    logger.info(`AiRewriteWorker ${this.id} processing rewrite for user ${userId}`);

    try {
      // Call existing AIService for rewrite functionality
      const rewrittenText = await this.aiService.rewriteContent(text, style, userId);

      return {
        originalText: text,
        rewrittenText,
        taskType: 'ai-rewrite',
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`AI rewrite failed for worker ${this.id}:`, error);
      throw new Error(`AI rewrite service error: ${(error as Error).message}`);
    }
  }
}