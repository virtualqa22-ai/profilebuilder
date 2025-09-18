/**
 * Centralized Validation Functions
 *
 * Contains all validation logic for data integrity and consistency.
 * Reusable across frontend and backend.
 * Includes security enhancements: input sanitization, injection prevention, and comprehensive validation.
 */

import { ILocale } from './localeService';

/**
 * Validates resume data against locale schema
 * @param data - The resume data to validate
 * @param schema - The locale schema to validate against
 * @returns Object containing validation errors
 */
export const validateResumeData = (data: any, schema: ILocale): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate sections with fields and order
  Object.entries(schema.sections).forEach(([sectionKey, section]) => {
    if (section.fields && section.order) {
      section.order.forEach((fieldName: string) => {
        const field = section.fields![fieldName];
        const inputId = `${sectionKey}-${fieldName}`;
        if (!field.optional && !data[sectionKey]?.[fieldName]) {
          errors[inputId] = `${field.label} is required.`;
        }
      });
    } else if (section.placeholder && !section.fields) {
      // For sections like summary, skills, projects, awardsCertifications
      const isSectionOptional = (schema.sections as any)[sectionKey]?.optional;
      if (!isSectionOptional && !data[sectionKey]) {
        errors[sectionKey] = `${section.label} is required.`;
      }
    }
  });

  // Validate work experience
  if (data.workExperience) {
    data.workExperience.forEach((exp: any, index: number) => {
      schema.sections.workExperience.order.forEach((fieldName: string) => {
        const field = schema.sections.workExperience.fields![fieldName];
        const inputId = `workExperience-${index}-${fieldName}`;
        if (!field.optional && !exp[fieldName]) {
          errors[inputId] = `${field.label} in Work Experience #${index + 1} is required.`;
        }
      });
    });
  }

  // Validate education
  if (data.education) {
    data.education.forEach((edu: any, index: number) => {
      schema.sections.education.order.forEach((fieldName: string) => {
        const field = schema.sections.education.fields![fieldName];
        const inputId = `education-${index}-${fieldName}`;
        if (!field.optional && !edu[fieldName]) {
          errors[inputId] = `${field.label} in Education #${index + 1} is required.`;
        }
      });
    });
  }

  // Validate optional fields based on locale schema
  if (schema.optionalFields) {
    for (const fieldName of ['photos', 'certifications', 'hobbies', 'references']) {
      const fieldConfig = (schema.optionalFields as any)[fieldName];
      if (fieldConfig && fieldConfig.enabled && fieldConfig.required && !data[fieldName]) {
        errors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required for this locale.`;
      }
    }
  }

  return errors;
};

/**
 * Validates file upload
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation error message or null if valid
 */
export const validateFileUpload = (file: File, allowedTypes: string[], maxSize: number): string | null => {
  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
  }
  if (file.size > maxSize) {
    return `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`;
  }
  return null;
};

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates string length
 * @param str - String to validate
 * @param maxLength - Maximum allowed length
 * @returns True if within limits
 */
export const validateLength = (str: string, maxLength: number): boolean => {
  return str.length <= maxLength;
};

/**
 * Sanitizes string input to prevent XSS attacks
 * Removes HTML tags and escapes special characters
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (str: string): string => {
  if (!str) return '';
  // Remove HTML tags
  const noTags = str.replace(/<[^>]*>/g, '');
  // Escape special characters
  return noTags.replace(/[&<>"']/g, (match) => {
    const escapeMap: { [key: string]: string } = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": '&#x27;'
    };
    return escapeMap[match] || match;
  });
};

/**
 * Validates password strength
 * Requires at least 8 characters, uppercase, lowercase, number, and special character
 * @param password - Password string to validate
 * @returns True if password meets strength requirements
 */
export const validatePassword = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

/**
 * Validates phone number format
 * Supports international formats with optional country code
 * @param phone - Phone number string to validate
 * @returns True if valid phone format
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates URL format and security
 * Prevents javascript: and data: schemes
 * @param url - URL string to validate
 * @returns True if valid and safe URL
 */
export const validateURL = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Prevent dangerous schemes
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:'];
    if (dangerousSchemes.some(scheme => parsedUrl.protocol === scheme)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Checks for potential SQL injection patterns
 * Basic detection of common SQL keywords in input
 * @param input - Input string to check
 * @returns True if potential SQL injection detected
 */
export const detectSQLInjection = (input: string): boolean => {
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'UNION'];
  const upperInput = input.toUpperCase();
  return sqlKeywords.some(keyword => upperInput.includes(keyword));
};

/**
 * Checks for potential XSS patterns
 * Detects script tags and common XSS vectors
 * @param input - Input string to check
 * @returns True if potential XSS detected
 */
export const detectXSS = (input: string): boolean => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi
  ];
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Enhanced email validation with additional security checks
 * @param email - Email string to validate
 * @returns True if valid and safe email format
 */
export const validateEmailSecure = (email: string): boolean => {
  // Basic format check
  if (!validateEmail(email)) return false;

  // Additional security checks
  const localPart = email.split('@')[0];
  const domainPart = email.split('@')[1];

  // Prevent overly long local/domain parts
  if (localPart.length > 64 || domainPart.length > 253) return false;

  // Prevent consecutive dots
  if (/\.\./.test(localPart) || /\.\./.test(domainPart)) return false;

  // Prevent suspicious characters
  if (/[<>'"\\]/.test(email)) return false;

  return true;
};

/**
 * Validates user input data with comprehensive security checks
 * @param data - Input data object to validate
 * @param schema - Validation schema
 * @returns Object containing validation errors
 */
export const validateSecureInput = (data: any, schema: any): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Sanitize and validate string fields
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      // Check for XSS
      if (detectXSS(data[key])) {
        errors[key] = 'Input contains potentially malicious content';
        return;
      }

      // Check for SQL injection
      if (detectSQLInjection(data[key])) {
        errors[key] = 'Input contains potentially malicious content';
        return;
      }

      // Sanitize the input
      data[key] = sanitizeString(data[key]);

      // Validate length if schema specifies
      if (schema[key]?.maxLength && !validateLength(data[key], schema[key].maxLength)) {
        errors[key] = `Input exceeds maximum length of ${schema[key].maxLength} characters`;
      }
    }
  });

  return errors;
};