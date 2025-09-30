/**
 * Unit tests for Error Handler utilities
 *
 * Tests error response creation and security header application including:
 * - Standardized error responses with different codes
 * - Database error handling
 * - Validation error handling
 * - Not found error handling
 * - Unauthorized error handling
 * - Security header application
 */

import {
  createErrorResponse,
  handleDatabaseError,
  handleValidationError,
  handleNotFoundError,
  handleUnauthorizedError,
  applySecurityHeaders,
  ERROR_CODES
} from '../errorHandler';
import { ERROR_MESSAGES } from '../messages';
import { SECURITY_HEADERS } from '../constants';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockReturnValue({
      headers: {
        set: jest.fn(),
      },
    }),
  },
}));

describe('Error Handler', () => {
  let mockNextResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNextResponse = {
      headers: {
        set: jest.fn(),
      },
    };

    const { NextResponse } = require('next/server');
    NextResponse.json.mockReturnValue(mockNextResponse);
  });

  describe('ERROR_CODES', () => {
    it('should have correct error code constants', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_CODES.BAD_REQUEST).toBe('BAD_REQUEST');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message and status', () => {
      const message = 'Test error';
      const status = 400;

      const result = createErrorResponse(message, status);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: message },
        { status }
      );
      expect(mockNextResponse.headers.set).toHaveBeenCalledTimes(Object.keys(SECURITY_HEADERS).length);
    });

    it('should create error response with code and details', () => {
      const message = 'Validation failed';
      const status = 422;
      const code = ERROR_CODES.VALIDATION_ERROR;
      const details = { field: 'email', issue: 'invalid format' };

      const result = createErrorResponse(message, status, code, details);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: message,
          code,
          details
        },
        { status }
      );
    });

    it('should use default status of 500', () => {
      const message = 'Server error';

      createErrorResponse(message);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: message },
        { status: 500 }
      );
    });

    it('should handle empty message', () => {
      const result = createErrorResponse('');

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: '' },
        { status: 500 }
      );
    });

    it('should apply all security headers', () => {
      createErrorResponse('test');

      // Verify all security headers are applied
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        expect(mockNextResponse.headers.set).toHaveBeenCalledWith(
          key.toLowerCase().replace(/_/g, '-'),
          value
        );
      });
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle database errors with proper logging and response', () => {
      const mockLogger = require('../logger').globalLogger;
      const error = new Error('Database connection failed');

      const result = handleDatabaseError(error);

      expect(result).toBe(mockNextResponse);
      expect(mockLogger.error).toHaveBeenCalledWith('Database error occurred', error);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR,
          code: ERROR_CODES.DATABASE_ERROR
        },
        { status: 500 }
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      const result = handleDatabaseError(error as any);

      expect(result).toBe(mockNextResponse);
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors with details', () => {
      const validationErrors = {
        email: 'Invalid email format',
        password: 'Password too weak',
        age: 'Must be 18 or older'
      };

      const result = handleValidationError(validationErrors);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          code: ERROR_CODES.VALIDATION_ERROR,
          details: validationErrors
        },
        { status: 400 }
      );
    });

    it('should handle empty validation errors', () => {
      const validationErrors = {};

      const result = handleValidationError(validationErrors);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          code: ERROR_CODES.VALIDATION_ERROR,
          details: validationErrors
        },
        { status: 400 }
      );
    });
  });

  describe('handleNotFoundError', () => {
    it('should handle not found errors with custom resource name', () => {
      const resource = 'User';

      const result = handleNotFoundError(resource);

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'User not found',
          code: ERROR_CODES.NOT_FOUND
        },
        { status: 404 }
      );
    });

    it('should handle not found errors with default message', () => {
      const resource = '';

      const result = handleNotFoundError(resource);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: ' not found',
          code: ERROR_CODES.NOT_FOUND
        },
        { status: 404 }
      );
    });
  });

  describe('handleUnauthorizedError', () => {
    it('should handle unauthorized errors', () => {
      const result = handleUnauthorizedError();

      expect(result).toBe(mockNextResponse);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Unauthorized',
          code: ERROR_CODES.UNAUTHORIZED
        },
        { status: 401 }
      );
    });
  });

  describe('applySecurityHeaders', () => {
    it('should apply all security headers to response', () => {
      const response = {
        headers: {
          set: jest.fn(),
        },
      };

      const result = applySecurityHeaders(response as any);

      expect(result).toBe(response);

      // Verify all security headers are applied
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        expect(response.headers.set).toHaveBeenCalledWith(
          key.toLowerCase().replace(/_/g, '-'),
          value
        );
      });
    });

    it('should handle responses without headers', () => {
      const response = {};

      expect(() => applySecurityHeaders(response as any)).not.toThrow();
    });

    it('should handle responses with null headers', () => {
      const response = { headers: null };

      expect(() => applySecurityHeaders(response as any)).not.toThrow();
    });
  });

  describe('security headers configuration', () => {
    it('should include all required security headers', () => {
      expect(SECURITY_HEADERS.CONTENT_TYPE_OPTIONS).toBe('nosniff');
      expect(SECURITY_HEADERS.FRAME_OPTIONS).toBe('SAMEORIGIN');
      expect(SECURITY_HEADERS.XSS_PROTECTION).toBe('1; mode=block');
      expect(SECURITY_HEADERS.REFERRER_POLICY).toBe('strict-origin-when-cross-origin');
      expect(SECURITY_HEADERS.PERMISSIONS_POLICY).toBe('geolocation=(), microphone=()');
      expect(SECURITY_HEADERS.HSTS).toBe('max-age=63072000; includeSubDomains; preload');
    });
  });

  describe('error response structure', () => {
    it('should maintain consistent error response structure', () => {
      const responses = [
        createErrorResponse('test1', 400),
        handleDatabaseError(new Error('test')),
        handleValidationError({ field: 'error' }),
        handleNotFoundError('Resource'),
        handleUnauthorizedError()
      ];

      responses.forEach(response => {
        expect(response).toBe(mockNextResponse);
      });

      // All responses should have applied security headers
      expect(mockNextResponse.headers.set).toHaveBeenCalledTimes(
        responses.length * Object.keys(SECURITY_HEADERS).length
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined error messages', () => {
      const result1 = createErrorResponse(null as any);
      const result2 = createErrorResponse(undefined as any);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle extreme status codes', () => {
      const result1 = createErrorResponse('test', 100);
      const result2 = createErrorResponse('test', 599);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle complex error details', () => {
      const complexDetails = {
        nested: {
          object: {
            with: ['arrays', 'and', { complex: 'data' }]
          }
        },
        numbers: 123,
        booleans: true,
        nulls: null
      };

      const result = createErrorResponse('test', 400, ERROR_CODES.VALIDATION_ERROR, complexDetails);

      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: complexDetails
        }),
        { status: 400 }
      );
    });
  });
});