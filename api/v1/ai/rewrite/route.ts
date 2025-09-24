import { NextRequest } from 'next/server';
import { getAIService } from '../../../../backend/lib/aiService';
import { validateAIRewriteRequest, createAIValidationErrorResponse } from '../../../../backend/lib/aiValidation';
import { handleAIError, createAISuccessResponse } from '../../../../backend/lib/aiErrorHandler';

/**
 * POST /api/v1/ai/rewrite
 *
 * Rewrites content using AI with optional style specification.
 *
 * Request body:
 * {
 *   "content": "string", // Required: Content to rewrite
 *   "style": "string",   // Optional: Writing style (e.g., "professional", "casual")
 *   "userId": "string"   // Optional: User identifier for rate limiting
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": "rewritten content"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateAIRewriteRequest(body);

    if (!validation.isValid) {
      return createAIValidationErrorResponse(validation.error!);
    }

    const { content, style, userId } = validation;

    // Get AI service instance and process request
    const aiService = getAIService();
    const rewrittenContent = await aiService.rewriteContent(content!, style, userId);

    // Return success response with logging
    return createAISuccessResponse(rewrittenContent, {
      contentLength: content!.length,
      style: style || 'default',
      userId: userId || 'anonymous',
      processingTime: Date.now() - startTime,
    });

  } catch (error: any) {
    return handleAIError(error, 'AI rewrite', startTime).response;
  }
}