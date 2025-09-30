/**
 * Unit tests for AI Error Handler
 *
 * Tests AI-specific error handling including:
 * - Error response creation with proper HTTP codes
 * - Success response formatting
 * - Error logging with context
 * - Security header application
 */

import {
  handleAIError,
  createAISuccessResponse,
  createAIValidationError
} from '../aiErrorHandler';
import { applySecurityHeaders } from '../errorHandler';
import { globalLogger } from '../logger';

// Mock dependencies
jest.mock('../errorHandler');
jest.mock('../logger');
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockReturnValue({
      headers: {
        set: jest.fn(),
      },
    }),
  },
}));

describe('AI Error Handler', () => {
  let mockNextResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNextResponse = {
      headers: {
        set: jest.fn(),
      },
    };

    // Setup NextResponse mock
    const { NextResponse } = require('next/server');
    NextResponse.json.mockReturnValue(mockNextResponse);

    (applySecurityHeaders as jest.Mock).mockReturnValue(mockNextResponse);
  });

  describe('handleAIError', () => {
    const startTime = Date.now();
    const operation = 'ai-rewrite';
    const metadata = { userId: 'user123', model: 'gpt-4' };

    it('should handle rate limit errors with 429 status', () => {
      const error = new Error('Rate limit exceeded. Retry after 60 seconds.');

      const result = handleAIError(error, operation, startTime, metadata);

      expect(result.response).toBe(mockNextResponse);
      expect(result.logged).toBe(true);

      // Verify NextResponse.json was called with correct parameters
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );

      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);
      expect(globalLogger.error).toHaveBeenCalledWith(
        `${operation} failed`,
        error,
        expect.objectContaining({
          processingTime: expect.any(Number),
          ...metadata
        })
      );
    });

    it('should handle circuit breaker errors with 503 status', () => {
      const error = new Error('Circuit breaker is open');

      const result = handleAIError(error, operation, startTime, metadata);

      expect(result.response).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    });

    it('should handle unsafe content errors with 400 status', () => {
      const error = new Error('Content contains unsafe content');

      const result = handleAIError(error, operation, startTime, metadata);

      expect(result.response).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Content contains unsafe content and cannot be processed.' },
        { status: 400 }
      );
    });

    it('should handle OpenAI API errors with 502 status', () => {
      const error = new Error('OpenAI API error: 500 Internal Server Error');

      const result = handleAIError(error, operation, startTime, metadata);

      expect(result.response).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 502 }
      );
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Unexpected error occurred');

      const result = handleAIError(error, operation, startTime, metadata);

      expect(result.response).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'An error occurred while processing your request.' },
        { status: 500 }
      );
    });

    it('should handle errors without metadata', () => {
      const error = new Error('Test error');

      const result = handleAIError(error, operation, startTime);

      expect(result.logged).toBe(true);
      expect(globalLogger.error).toHaveBeenCalledWith(
        `${operation} failed`,
        error,
        expect.objectContaining({
          processingTime: expect.any(Number)
        })
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      const result = handleAIError(error as any, operation, startTime);

      expect(result.logged).toBe(true);
      expect(globalLogger.error).toHaveBeenCalled();
    });

    it('should calculate processing time correctly', () => {
      const fixedStartTime = Date.now() - 1000; // 1 second ago
      const error = new Error('Test error');

      handleAIError(error, operation, fixedStartTime);

      expect(globalLogger.error).toHaveBeenCalledWith(
        `${operation} failed`,
        error,
        expect.objectContaining({
          processingTime: expect.any(Number)
        })
      );
    });
  });

  describe('createAISuccessResponse', () => {
    it('should create success response with data', () => {
      const testData = { result: 'AI processed content', score: 85 };

      const result = createAISuccessResponse(testData);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
      });
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);
    });

    it('should create success response without metadata', () => {
      const testData = 'Simple response';

      const result = createAISuccessResponse(testData);

      expect(result).toBe(mockNextResponse);
      expect(globalLogger.info).not.toHaveBeenCalled();
    });

    it('should log success when metadata provided', () => {
      const testData = { suggestions: ['Improve grammar', 'Use active voice'] };
      const metadata = { operation: 'ai-suggestions', userId: 'user123' };

      const result = createAISuccessResponse(testData, metadata);

      expect(globalLogger.info).toHaveBeenCalledWith('AI operation completed successfully', metadata);
    });

    it('should handle complex data structures', () => {
      const complexData = {
        issues: [
          { type: 'warning', message: 'Passive voice detected', line: 5 }
        ],
        score: 78,
        metadata: { model: 'gpt-4', processingTime: 1200 }
      };

      const result = createAISuccessResponse(complexData);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        data: complexData,
      });
    });
  });

  describe('createAIValidationError', () => {
    it('should create validation error response with default 400 status', () => {
      const message = 'Content is required and must be a string';

      const result = createAIValidationError(message);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: message },
        { status: 400 }
      );
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);
    });

    it('should create validation error response with custom status', () => {
      const message = 'Content exceeds maximum length';
      const status = 413;

      const result = createAIValidationError(message, status);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: message },
        { status }
      );
    });

    it('should handle empty message', () => {
      const result = createAIValidationError('');

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: '' },
        { status: 400 }
      );
    });

    it('should handle long error messages', () => {
      const longMessage = 'a'.repeat(1000);

      const result = createAIValidationError(longMessage, 422);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: longMessage },
        { status: 422 }
      );
    });
  });

  describe('integration with security headers', () => {
    it('should apply security headers to all responses', () => {
      // Test handleAIError
      handleAIError(new Error('test'), 'test-op', Date.now());
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);

      // Reset mock
      (applySecurityHeaders as jest.Mock).mockClear();

      // Test createAISuccessResponse
      createAISuccessResponse('test data');
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);

      // Reset mock
      (applySecurityHeaders as jest.Mock).mockClear();

      // Test createAIValidationError
      createAIValidationError('test error');
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockNextResponse);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle errors with undefined message', () => {
      const error = new Error();
      error.message = undefined as any;

      const result = handleAIError(error, 'test', Date.now());

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'An error occurred while processing your request.' },
        { status: 500 }
      );
    });

    it('should handle null error object', () => {
      const result = handleAIError(null as any, 'test', Date.now());

      expect(result.logged).toBe(true);
      expect(globalLogger.error).toHaveBeenCalled();
    });

    it('should handle error with special characters in message', () => {
      const error = new Error('Error with <script> tags & "quotes"');

      const result = handleAIError(error, 'test', Date.now());

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'An error occurred while processing your request.' },
        { status: 500 }
      );
    });
  });

  describe('response structure consistency', () => {
    it('should maintain consistent response structure across all functions', () => {
      const errorResult = handleAIError(new Error('test'), 'test', Date.now());
      const successResult = createAISuccessResponse('data');
      const validationResult = createAIValidationError('error');

      // All should return NextResponse objects
      expect(errorResult.response).toBeDefined();
      expect(successResult).toBeDefined();
      expect(validationResult).toBeDefined();

      // All should have applied security headers
      expect(applySecurityHeaders).toHaveBeenCalledTimes(3);
    });
  });
});