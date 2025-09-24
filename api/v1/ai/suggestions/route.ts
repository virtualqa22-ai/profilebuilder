import { NextRequest } from 'next/server';
import { getAIService } from '../../../../backend/lib/aiService';
import { validateAIRequest, createAIValidationErrorResponse } from '../../../../backend/lib/aiValidation';
import { handleAIError, createAISuccessResponse } from '../../../../backend/lib/aiErrorHandler';

/**
 * POST /api/v1/ai/suggestions
 *
 * Provides grammar, style, and general improvement suggestions for content.
 *
 * Request body:
 * {
 *   "content": "string", // Required: Content to analyze
 *   "userId": "string"   // Optional: User identifier for rate limiting
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "grammar": ["suggestion1", "suggestion2"],
 *     "style": ["suggestion1", "suggestion2"],
 *     "suggestions": ["general1", "general2"]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateAIRequest(body);

    if (!validation.isValid) {
      return createAIValidationErrorResponse(validation.error!);
    }

    const { content, userId } = validation;

    // Get AI service instance and process request
    const aiService = getAIService();
    const suggestions = await aiService.getSuggestions(content!, userId);

    // Return success response with logging
    return createAISuccessResponse(suggestions, {
      contentLength: content!.length,
      userId: userId || 'anonymous',
      processingTime: Date.now() - startTime,
      grammarCount: suggestions.grammar.length,
      styleCount: suggestions.style.length,
      generalCount: suggestions.suggestions.length,
    });

  } catch (error: any) {
    return handleAIError(error, 'AI suggestions', startTime).response;
  }
}