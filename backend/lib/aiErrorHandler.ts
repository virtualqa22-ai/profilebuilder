/**
 * AI API Error Handler
 *
 * Centralized error handling logic for AI-related API endpoints to ensure
 * consistent error responses and reduce code duplication.
 */

import { NextResponse } from 'next/server';
import { applySecurityHeaders } from './errorHandler';
import { globalLogger } from './logger';

/**
 * Interface for AI error handling result
 */
export interface AIErrorHandlingResult {
  response: NextResponse;
  logged: boolean;
}

/**
 * Handles AI-specific errors with appropriate HTTP status codes and messages
 * @param error - The error that occurred
 * @param operation - The operation being performed (for logging)
 * @param startTime - Start time of the operation (for performance logging)
 * @param metadata - Additional metadata for logging
 * @returns Standardized error response
 */
export const handleAIError = (
  error: any,
  operation: string,
  startTime: number,
  metadata?: Record<string, any>
): AIErrorHandlingResult => {
  const processingTime = Date.now() - startTime;

  // Log the error with context
  globalLogger.error(`${operation} failed`, error, {
    processingTime,
    ...metadata,
  });

  let status = 500;
  let message = 'An error occurred while processing your request.';

  // Handle specific AI error types
  if (error.message?.includes('Rate limit exceeded')) {
    status = 429;
    message = 'Rate limit exceeded. Please try again later.';
  } else if (error.message?.includes('Circuit breaker is open')) {
    status = 503;
    message = 'Service temporarily unavailable. Please try again later.';
  } else if (error.message?.includes('unsafe content')) {
    status = 400;
    message = 'Content contains unsafe content and cannot be processed.';
  } else if (error.message?.includes('OpenAI API error')) {
    status = 502;
    message = 'AI service temporarily unavailable. Please try again later.';
  }

  const response = NextResponse.json(
    { success: false, error: message },
    { status }
  );

  applySecurityHeaders(response);

  return {
    response,
    logged: true,
  };
};

/**
 * Creates a successful AI response with standardized structure
 * @param data - The response data
 * @param metadata - Additional metadata for logging
 * @returns Standardized success response
 */
export const createAISuccessResponse = (
  data: any,
  metadata?: Record<string, any>
): NextResponse => {
  const response = NextResponse.json({
    success: true,
    data,
  });

  // Log success if metadata provided
  if (metadata) {
    globalLogger.info('AI operation completed successfully', metadata);
  }

  applySecurityHeaders(response);
  return response;
};

/**
 * Handles AI validation errors
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Standardized validation error response
 */
export const createAIValidationError = (message: string, status: number = 400): NextResponse => {
  const response = NextResponse.json(
    { success: false, error: message },
    { status }
  );

  applySecurityHeaders(response);
  return response;
};