import { NextRequest } from 'next/server';
import { getAIService } from '../../../../backend/lib/aiService';
import { validateAILintRequest, createAIValidationErrorResponse } from '../../../../backend/lib/aiValidation';
import { handleAIError, createAISuccessResponse } from '../../../../backend/lib/aiErrorHandler';

/**
 * POST /api/v1/ai/lint
 *
 * Detects linting issues, errors, and provides improvement suggestions for content.
 *
 * Request body:
 * {
 *   "content": "string",     // Required: Content to analyze
 *   "language": "string",    // Optional: Language/type of content (default: "text")
 *   "userId": "string"       // Optional: User identifier for rate limiting
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "issues": [
 *       {
 *         "type": "error|warning|info",
 *         "message": "description of the issue",
 *         "line": 1,
 *         "column": 1,
 *         "severity": "error|warning|info"
 *       }
 *     ],
 *     "score": 85
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateAILintRequest(body);

    if (!validation.isValid) {
      return createAIValidationErrorResponse(validation.error!);
    }

    const { content, language, userId } = validation;

    // Get AI service instance and process request
    const aiService = getAIService();
    const lintResult = await aiService.detectLintIssues(content!, language!, userId);

    // Return success response with logging
    return createAISuccessResponse(lintResult, {
      contentLength: content!.length,
      language: language!,
      userId: userId || 'anonymous',
      processingTime: Date.now() - startTime,
      issuesCount: lintResult.issues.length,
      score: lintResult.score,
    });

  } catch (error: any) {
    return handleAIError(error, 'AI lint', startTime).response;
  }
}