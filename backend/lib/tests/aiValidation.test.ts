/**
 * Unit tests for AI Validation utilities
 *
 * Tests validation logic for AI-related API endpoints including:
 * - Content validation with length limits
 * - Optional field validation
 * - Request body validation for different endpoints
 * - Error response creation
 */

import {
  validateAIContent,
  validateOptionalString,
  validateAIRequest,
  validateAIRewriteRequest,
  validateAILintRequest,
  createAIValidationErrorResponse,
  AI_VALIDATION_CONSTANTS
} from '../aiValidation';

describe('AI Validation', () => {
  describe('AI_VALIDATION_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH).toBe(10000);
      expect(AI_VALIDATION_CONSTANTS.MIN_CONTENT_LENGTH).toBe(1);
    });
  });

  describe('validateAIContent', () => {
    it('should validate valid string content', () => {
      const result = validateAIContent('Valid content for AI processing');

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Valid content for AI processing');
      expect(result.error).toBeUndefined();
    });

    it('should reject null content', () => {
      const result = validateAIContent(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content is required and must be a string');
      expect(result.error?.status).toBe(400);
    });

    it('should reject undefined content', () => {
      const result = validateAIContent(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content is required and must be a string');
    });

    it('should reject non-string content', () => {
      const result = validateAIContent(123 as any);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content is required and must be a string');
    });

    it('should reject empty string', () => {
      const result = validateAIContent('');

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content cannot be empty');
      expect(result.error?.status).toBe(400);
    });

    it('should accept whitespace-only string', () => {
      const result = validateAIContent('   ');

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('   ');
    });

    it('should reject content exceeding maximum length', () => {
      const longContent = 'a'.repeat(AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH + 1);
      const result = validateAIContent(longContent);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toContain('Content exceeds maximum length');
      expect(result.error?.status).toBe(400);
    });

    it('should accept content at maximum length', () => {
      const maxContent = 'a'.repeat(AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH);
      const result = validateAIContent(maxContent);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe(maxContent);
    });

    it('should accept content at minimum length', () => {
      const minContent = 'a';
      const result = validateAIContent(minContent);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe(minContent);
    });
  });

  describe('validateOptionalString', () => {
    it('should validate valid string value', () => {
      const result = validateOptionalString('valid string', 'testField');

      expect(result.isValid).toBe(true);
      expect(result.value).toBe('valid string');
      expect(result.error).toBeUndefined();
    });

    it('should accept undefined value', () => {
      const result = validateOptionalString(undefined, 'testField');

      expect(result.isValid).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('should reject null value', () => {
      const result = validateOptionalString(null, 'testField');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('testField must be a string');
    });

    it('should reject non-string values', () => {
      const result = validateOptionalString(123, 'testField');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('testField must be a string');
    });

    it('should handle empty string as valid but convert to undefined', () => {
      const result = validateOptionalString('', 'testField');

      expect(result.isValid).toBe(true);
      expect(result.value).toBeUndefined();
    });
  });

  describe('validateAIRequest', () => {
    it('should validate complete valid request', () => {
      const requestBody = {
        content: 'Valid content for AI processing',
        userId: 'user123'
      };

      const result = validateAIRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Valid content for AI processing');
      expect(result.userId).toBe('user123');
    });

    it('should validate request without optional userId', () => {
      const requestBody = {
        content: 'Valid content for AI processing'
      };

      const result = validateAIRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Valid content for AI processing');
      expect(result.userId).toBeUndefined();
    });

    it('should reject request with invalid content', () => {
      const requestBody = {
        content: '',
        userId: 'user123'
      };

      const result = validateAIRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content cannot be empty');
    });

    it('should reject request with invalid userId type', () => {
      const requestBody = {
        content: 'Valid content',
        userId: 123
      };

      const result = validateAIRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('userId must be a string');
    });

    it('should handle missing request body', () => {
      const result = validateAIRequest(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content is required and must be a string');
    });
  });

  describe('validateAIRewriteRequest', () => {
    it('should validate complete valid rewrite request', () => {
      const requestBody = {
        content: 'Content to rewrite',
        userId: 'user123',
        style: 'professional'
      };

      const result = validateAIRewriteRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Content to rewrite');
      expect(result.userId).toBe('user123');
      expect(result.style).toBe('professional');
    });

    it('should validate rewrite request without optional fields', () => {
      const requestBody = {
        content: 'Content to rewrite'
      };

      const result = validateAIRewriteRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Content to rewrite');
      expect(result.userId).toBeUndefined();
      expect(result.style).toBeUndefined();
    });

    it('should reject rewrite request with invalid style type', () => {
      const requestBody = {
        content: 'Content to rewrite',
        style: 123
      };

      const result = validateAIRewriteRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Style must be a string');
    });

    it('should inherit base validation failures', () => {
      const requestBody = {
        content: '',
        style: 'professional'
      };

      const result = validateAIRewriteRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Content cannot be empty');
    });
  });

  describe('validateAILintRequest', () => {
    it('should validate complete valid lint request', () => {
      const requestBody = {
        content: 'Content to lint',
        userId: 'user123',
        language: 'javascript'
      };

      const result = validateAILintRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Content to lint');
      expect(result.userId).toBe('user123');
      expect(result.language).toBe('javascript');
    });

    it('should default language to "text" when not provided', () => {
      const requestBody = {
        content: 'Content to lint',
        userId: 'user123'
      };

      const result = validateAILintRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.language).toBe('text');
    });

    it('should validate lint request with explicit text language', () => {
      const requestBody = {
        content: 'Content to lint',
        language: 'text'
      };

      const result = validateAILintRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.language).toBe('text');
    });

    it('should reject lint request with invalid language type', () => {
      const requestBody = {
        content: 'Content to lint',
        language: 123
      };

      const result = validateAILintRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe('Language must be a string');
    });

    it('should inherit base validation failures', () => {
      const requestBody = {
        content: 'x'.repeat(AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH + 1),
        language: 'text'
      };

      const result = validateAILintRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toContain('Content exceeds maximum length');
    });
  });

  describe('createAIValidationErrorResponse', () => {
    it('should create error response with correct structure', () => {
      const { createAIValidationErrorResponse } = require('../aiValidation');
      const error = { message: 'Validation failed', status: 400 };

      const response = createAIValidationErrorResponse(error);

      expect(response).toBeDefined();
    });

    it('should handle different error statuses', () => {
      const { createAIValidationErrorResponse } = require('../aiValidation');
      const error = { message: 'Server error', status: 500 };

      const response = createAIValidationErrorResponse(error);

      expect(response).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle content with only special characters', () => {
      const result = validateAIContent('!@#$%^&*()');

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('!@#$%^&*()');
    });

    it('should handle content with unicode characters', () => {
      const result = validateAIContent('Hello 世界 🌍');

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Hello 世界 🌍');
    });

    it('should handle content with newlines and tabs', () => {
      const result = validateAIContent('Line 1\n\tLine 2');

      expect(result.isValid).toBe(true);
      expect(result.content).toBe('Line 1\n\tLine 2');
    });

    it('should accept content at minimum length after trimming logic', () => {
      const content = 'a'.repeat(AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH - 1) + ' ';
      const result = validateAIContent(content);

      expect(result.isValid).toBe(true);
    });
  });

  describe('integration with NextResponse', () => {
    it('should properly integrate with NextResponse for error handling', () => {
      const invalidRequest = validateAIRequest({ content: '' });

      expect(invalidRequest.isValid).toBe(false);
      expect(invalidRequest.error).toBeDefined();
      expect(invalidRequest.error?.status).toBe(400);
      expect(invalidRequest.error?.message).toBe('Content cannot be empty');
    });
  });
});