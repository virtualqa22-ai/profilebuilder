/**
 * Standardized Error Handling
 *
 * Provides consistent error response formatting and codes across the application.
 */

import { NextResponse } from 'next/server';
import { ERROR_MESSAGES } from './messages';
import { SECURITY_HEADERS } from './constants';
import { globalLogger } from './logger';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Error codes for consistent error identification
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Creates a standardized error response
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Error code
 * @param details - Additional error details
 * @returns NextResponse with error
 */
export const createErrorResponse = (
  message: string,
  status: number = 500,
  code?: ErrorCode,
  details?: any
): NextResponse<ErrorResponse> => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };

  const response = NextResponse.json(errorResponse, { status });

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key.toLowerCase().replace(/_/g, '-'), value);
  });

  return response;
};

/**
 * Handles database errors
 * @param error - The error object
 * @returns Standardized error response
 */
export const handleDatabaseError = (error: any): NextResponse => {
  globalLogger.error('Database error occurred', error);
  return createErrorResponse(
    ERROR_MESSAGES.DATABASE_ERROR,
    500,
    ERROR_CODES.DATABASE_ERROR,
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
};

/**
 * Handles validation errors
 * @param errors - Validation error object
 * @returns Standardized error response
 */
export const handleValidationError = (errors: Record<string, string>): NextResponse => {
  return createErrorResponse(
    ERROR_MESSAGES.VALIDATION_ERROR,
    400,
    ERROR_CODES.VALIDATION_ERROR,
    errors
  );
};

/**
 * Handles not found errors
 * @param resource - The resource that was not found
 * @returns Standardized error response
 */
export const handleNotFoundError = (resource: string): NextResponse => {
  return createErrorResponse(
    `${resource} not found`,
    404,
    ERROR_CODES.NOT_FOUND
  );
};

/**
 * Handles unauthorized errors
 * @returns Standardized error response
 */
export const handleUnauthorizedError = (): NextResponse => {
  return createErrorResponse(
    'Unauthorized',
    401,
    ERROR_CODES.UNAUTHORIZED
  );
};