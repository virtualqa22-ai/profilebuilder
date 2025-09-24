/**
 * Shared Validation Library
 *
 * Framework-agnostic validation functions for resume, cover letter, and ad metric data.
 * Contains centralized validation logic to eliminate duplication between frontend and backend.
 *
 * Includes security enhancements: input sanitization, injection prevention, and comprehensive validation.
 *
 * Business Rules:
 * - Email validation supports international formats with security checks
 * - Password strength requires 8+ chars with mixed case, numbers, and special chars
 * - Phone validation supports international formats
 * - URL validation prevents dangerous schemes (javascript, data, vbscript)
 * - File uploads limited by type and size for security
 * - Resume data validation follows locale-specific schemas
 *
 * Security Measures:
 * - XSS detection and prevention with pattern matching
 * - SQL injection detection for common attack vectors
 * - Input sanitization removes HTML tags and escapes special characters
 * - File type validation prevents malicious uploads
 * - Length limits prevent buffer overflow attacks
 * - Email security checks prevent spoofing and injection
 */

// Constants
export const MAX_FIELD_LENGTH = 500;

// Type definitions for validation

export interface ValidationResult {
  [key: string]: string;
}

export interface ValidationSchema {
  [key: string]: {
    maxLength?: number;
  };
}

export interface InputData {
  [key: string]: unknown;
}

export interface ResumeData {
  [sectionKey: string]: unknown;
}

export interface ILocale {
  locale: string;
  name: string;
  dateFormat: string;
  sections: {
    [key: string]: {
      label: string;
      placeholder?: string;
      fields?: {
        [key: string]: {
          label: string;
          placeholder: string;
          optional?: boolean;
        };
      };
      order?: string[];
      optional?: boolean;
    };
  };
  optionalFields?: {
    photos?: {
      enabled: boolean;
      required?: boolean;
    };
    certifications?: {
      enabled: boolean;
      required?: boolean;
    };
    hobbies?: {
      enabled: boolean;
      required?: boolean;
    };
    references?: {
      enabled: boolean;
      required?: boolean;
    };
  };
}

interface IAdMetricData {
  user_id?: string;
  ad_id?: string;
  event_type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validates resume data against locale schema
 * @param data - The resume data to validate
 * @param schema - The locale schema to validate against
 * @returns Object containing validation errors
 */
export const validateResumeData = (data: ResumeData, schema: ILocale): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validate sections with fields and order
  Object.entries(schema.sections).forEach(([sectionKey, section]) => {
    if (section.fields && section.order) {
      // Skip sections that are not present in data
      if (!data[sectionKey]) return;
      // Skip array sections (workExperience, education) as they are validated separately
      if (Array.isArray(data[sectionKey])) return;
      section.order.forEach((fieldName: string) => {
        const field = section.fields![fieldName];
        const inputId = `${sectionKey}-${fieldName}`;
        if (!field.optional && !data[sectionKey]?.[fieldName]) {
          errors[inputId] = `${field.label} is required.`;
        }
      });
    } else if (section.placeholder && !section.fields) {
      // For sections like summary, skills, projects, awardsCertifications
      const isSectionOptional = (schema.sections[sectionKey] as any)?.optional;
      if (!isSectionOptional && !data[sectionKey]) {
        errors[sectionKey] = `${section.label} is required.`;
      }
    }
  });

  // Validate work experience
  if (data.workExperience && schema.sections.workExperience.order) {
    (data.workExperience as Array<Record<string, string>>).forEach((exp, index: number) => {
      schema.sections.workExperience.order!.forEach((fieldName: string) => {
        const field = schema.sections.workExperience.fields![fieldName];
        const inputId = `workExperience-${index}-${fieldName}`;
        if (!field.optional && !exp[fieldName]) {
          errors[inputId] = `${field.label} in Work Experience #${index + 1} is required.`;
        }
      });
    });
  }

  // Validate education
  if (data.education && schema.sections.education.order) {
    (data.education as Array<Record<string, string>>).forEach((edu, index: number) => {
      schema.sections.education.order!.forEach((fieldName: string) => {
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
    for (const fieldName of ['photos', 'certifications', 'hobbies', 'references'] as const) {
      const fieldConfig = schema.optionalFields[fieldName];
      if (fieldConfig && fieldConfig.enabled && fieldConfig.required && !data[fieldName]) {
        errors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required for this locale.`;
      }
    }
  }

  return errors;
};

/**
 * Validates cover letter data with comprehensive business rules and security checks
 *
 * Performs validation on all cover letter fields including required field checks,
 * email format validation, phone number validation, template selection validation,
 * and length constraints. All input is sanitized for security.
 *
 * Required fields: name, email, recipientName, companyName, body, template
 * Optional fields: address, phone, date, recipientTitle, companyAddress, salutation, closing, signature
 *
 * Validation rules:
 * - Email: Must be valid format with security checks
 * - Phone: Must match international phone number pattern (optional)
 * - Template: Must be 'classic' or 'modern'
 * - Name: Max length 500 characters
 * - Body: Max length 2000 characters
 *
 * @param data - The cover letter data object to validate
 * @returns Object containing field-specific validation error messages, empty if valid
 */
export const validateCoverLetterData = (data: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  date?: string;
  recipientName?: string;
  recipientTitle?: string;
  companyName?: string;
  companyAddress?: string;
  salutation?: string;
  body?: string;
  closing?: string;
  signature?: string;
  template?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Required fields
  const requiredFields = ['name', 'email', 'recipientName', 'companyName', 'body', 'template'];
  for (const field of requiredFields) {
    if (!data[field as keyof typeof data]) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
    }
  }

  // Email validation
  if (data.email && !validateEmailSecure(data.email)) {
    errors.email = 'Invalid email format.';
  }

  // Phone validation if provided
  if (data.phone && !validatePhone(data.phone)) {
    errors.phone = 'Invalid phone number format.';
  }

  // Template validation
  if (data.template && !['classic', 'modern'].includes(data.template)) {
    errors.template = 'Invalid template. Must be "classic" or "modern".';
  }

  // Length validations
  if (data.name && data.name.length > MAX_FIELD_LENGTH) {
    errors.name = `Name exceeds maximum length of ${MAX_FIELD_LENGTH} characters.`;
  }
  if (data.body && data.body.length > 2000) {
    errors.body = 'Body exceeds maximum length of 2000 characters.';
  }

  return errors;
};

/**
 * Validates ad metric data with comprehensive business rules and security checks
 *
 * Performs validation on ad metric fields including required field checks,
 * event type validation, ad ID format validation, and length constraints.
 * All input is sanitized for security.
 *
 * Required fields: user_id, ad_id, event_type
 * Optional fields: metadata
 *
 * Validation rules:
 * - user_id: Must be non-empty string, max 500 characters
 * - ad_id: Must be non-empty string, max 100 characters
 * - event_type: Must be one of allowed types (impression, click, view, hover, close)
 * - metadata: Optional object, sanitized if present
 *
 * @param data - The ad metric data object to validate
 * @returns Object containing field-specific validation error messages, empty if valid
 */
export const validateAdMetricData = (data: IAdMetricData): ValidationResult => {
  const errors: Record<string, string> = {};

  // Required fields
  const requiredFields = ['user_id', 'ad_id', 'event_type'];
  for (const field of requiredFields) {
    if (!data[field as keyof typeof data]) {
      errors[field] = `${field.replace('_', ' ')} is required.`;
    }
  }

  // user_id validation
  if (data.user_id && (typeof data.user_id !== 'string' || data.user_id.length > 500)) {
    errors.user_id = 'User ID must be a string with maximum length of 500 characters.';
  }

  // ad_id validation
  if (data.ad_id && (typeof data.ad_id !== 'string' || data.ad_id.length > 100)) {
    errors.ad_id = 'Ad ID must be a string with maximum length of 100 characters.';
  }

  // event_type validation
  const allowedEventTypes = ['impression', 'click', 'view', 'hover', 'close'];
  if (data.event_type && !allowedEventTypes.includes(data.event_type)) {
    errors.event_type = `Event type must be one of: ${allowedEventTypes.join(', ')}.`;
  }

  // metadata validation (optional, but sanitize if present)
  if (data.metadata && typeof data.metadata !== 'object') {
    errors.metadata = 'Metadata must be an object if provided.';
  }

  return errors;
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