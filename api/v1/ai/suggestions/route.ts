import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '../../../../backend/lib/aiService';
import { applySecurityHeaders } from '../../../../backend/lib/errorHandler';
import { globalLogger } from '../../../../backend/lib/logger';

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
    // Parse request body
    const body = await request.json();
    const { content, userId } = body;

    // Validate required fields
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Content exceeds maximum length of 10,000 characters' },
        { status: 400 }
      );
    }

    // Get AI service instance
    const aiService = getAIService();

    // Process the suggestions request
    const suggestions = await aiService.getSuggestions(content, userId);

    // Log successful request
    globalLogger.info('AI suggestions completed', {
      contentLength: content.length,
      userId: userId || 'anonymous',
      processingTime: Date.now() - startTime,
      grammarCount: suggestions.grammar.length,
      styleCount: suggestions.style.length,
      generalCount: suggestions.suggestions.length,
    });

    const response = NextResponse.json({
      success: true,
      data: suggestions,
    });

    applySecurityHeaders(response);
    return response;

  } catch (error: any) {
    // Log error
    globalLogger.error('AI suggestions failed', error, {
      processingTime: Date.now() - startTime,
    });

    // Handle specific error types
    if (error.message?.includes('Rate limit exceeded')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('Circuit breaker is open')) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('unsafe content')) {
      return NextResponse.json(
        { success: false, error: 'Content contains unsafe content and cannot be processed.' },
        { status: 400 }
      );
    }

    // Generic error response
    const response = NextResponse.json(
      { success: false, error: 'An error occurred while processing your request.' },
      { status: 500 }
    );

    applySecurityHeaders(response);
    return response;
  }
}