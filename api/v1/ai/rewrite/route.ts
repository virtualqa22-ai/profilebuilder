import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '../../../../backend/lib/aiService';
import { applySecurityHeaders } from '../../../../backend/lib/errorHandler';
import { globalLogger } from '../../../../backend/lib/logger';

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
    // Parse request body
    const body = await request.json();
    const { content, style, userId } = body;

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

    // Validate style if provided
    if (style && typeof style !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Style must be a string' },
        { status: 400 }
      );
    }

    // Get AI service instance
    const aiService = getAIService();

    // Process the rewrite request
    const rewrittenContent = await aiService.rewriteContent(content, style, userId);

    // Log successful request
    globalLogger.info('AI rewrite completed', {
      contentLength: content.length,
      style: style || 'default',
      userId: userId || 'anonymous',
      processingTime: Date.now() - startTime,
    });

    const response = NextResponse.json({
      success: true,
      data: rewrittenContent,
    });

    applySecurityHeaders(response);
    return response;

  } catch (error: any) {
    // Log error
    globalLogger.error('AI rewrite failed', error, {
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