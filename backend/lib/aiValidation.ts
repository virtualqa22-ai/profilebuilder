/**
 * AI API Validation Utilities
 *
 * Centralized validation logic for AI-related API endpoints to ensure consistency
 * and reduce code duplication across suggestions, rewrite, and lint routes.
 */

import { NextResponse } from 'next/server';

// Constants for AI validation
export const AI_VALIDATION_CONSTANTS = {
  MAX_CONTENT_LENGTH: 10000,
  MIN_CONTENT_LENGTH: 1,
} as const;

/**
 * Interface for AI request validation result
 */
export interface AIValidationResult {
  isValid: boolean;
  content?: string;
  userId?: string;
  error?: {
    message: string;
    status: number;
  };
}

/**
 * Interface for AI request body
 */
export interface AIRequestBody {
  content: string;
  userId?: string;
  style?: string;
  language?: string;
}

/**
 * Validates AI request content
 * @param content - The content to validate
 * @returns Validation result
 */
export const validateAIContent = (content: any): AIValidationResult => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: {
        message: 'Content is required and must be a string',
        status: 400,
      },
    };
  }

  if (content.length < AI_VALIDATION_CONSTANTS.MIN_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: {
        message: 'Content cannot be empty',
        status: 400,
      },
    };
  }

  if (content.length > AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: {
        message: `Content exceeds maximum length of ${AI_VALIDATION_CONSTANTS.MAX_CONTENT_LENGTH} characters`,
        status: 400,
      },
    };
  }

  return {
    isValid: true,
    content,
  };
};

/**
 * Validates optional string field
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export const validateOptionalString = (value: any, fieldName: string): { isValid: boolean; value?: string; error?: string } => {
  if (value !== undefined && typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
    };
  }

  return {
    isValid: true,
    value: value || undefined,
  };
};

/**
 * Validates complete AI request body
 * @param body - The request body to validate
 * @returns Complete validation result
 */
export const validateAIRequest = (body: any): AIValidationResult => {
  // Validate content
  const contentValidation = validateAIContent(body.content);
  if (!contentValidation.isValid) {
    return contentValidation;
  }

  // Validate optional fields
  const userIdValidation = validateOptionalString(body.userId, 'userId');
  if (!userIdValidation.isValid) {
    return {
      isValid: false,
      error: {
        message: userIdValidation.error!,
        status: 400,
      },
    };
  }

  return {
    isValid: true,
    content: contentValidation.content,
    userId: userIdValidation.value,
  };
};

/**
 * Validates AI request with style parameter (for rewrite endpoint)
 * @param body - The request body to validate
 * @returns Complete validation result
 */
export const validateAIRewriteRequest = (body: any): AIValidationResult & { style?: string } => {
  const baseValidation = validateAIRequest(body);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const styleValidation = validateOptionalString(body.style, 'Style');
  if (!styleValidation.isValid) {
    return {
      isValid: false,
      error: {
        message: styleValidation.error!,
        status: 400,
      },
    };
  }

  return {
    ...baseValidation,
    style: styleValidation.value,
  };
};

/**
 * Validates AI request with language parameter (for lint endpoint)
 * @param body - The request body to validate
 * @returns Complete validation result
 */
export const validateAILintRequest = (body: any): AIValidationResult & { language?: string } => {
  const baseValidation = validateAIRequest(body);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const languageValidation = validateOptionalString(body.language, 'Language');
  if (!languageValidation.isValid) {
    return {
      isValid: false,
      error: {
        message: languageValidation.error!,
        status: 400,
      },
    };
  }

  return {
    ...baseValidation,
    language: languageValidation.value || 'text', // Default to 'text' if not provided
  };
};

/**
 * Creates standardized error response for AI validation failures
 * @param error - The validation error
 * @returns NextResponse with error
 */
export const createAIValidationErrorResponse = (error: { message: string; status: number }): NextResponse => {
  return NextResponse.json(
    { success: false, error: error.message },
    { status: error.status }
  );
};