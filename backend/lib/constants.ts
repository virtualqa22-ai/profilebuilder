/**
 * Centralized Constants
 *
 * Contains all application constants, default values, and configuration settings
 * to ensure consistency and ease of maintenance.
 */

// Database Constants

// Validation Constants
export const MAX_TITLE_LENGTH = 100;
export const MAX_FIELD_LENGTH = 500;

// API Constants
export const DEFAULT_LOCALE = 'en-US';

// Security Constants
export const SECURITY_HEADERS = Object.freeze({
  CONTENT_TYPE_OPTIONS: 'nosniff',
  FRAME_OPTIONS: 'SAMEORIGIN',
  XSS_PROTECTION: '1; mode=block',
  REFERRER_POLICY: 'strict-origin-when-cross-origin',
  PERMISSIONS_POLICY: 'geolocation=(), microphone=()',
  HSTS: 'max-age=63072000; includeSubDomains; preload',
});
// Security Event Types
export const SECURITY_EVENT_TYPES = {
  AUTH_FAILURE: 'authentication_failure',
  RATE_LIMIT_VIOLATION: 'rate_limit_violation',
  INPUT_VALIDATION_FAILURE: 'input_validation_failure',
  AI_SECURITY_EVENT: 'ai_security_event',
  PRIVACY_COMPLIANCE_ACTION: 'privacy_compliance_action',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  ACCESS_DENIED: 'access_denied',
  SESSION_ANOMALY: 'session_anomaly',
  ENCRYPTION_ERROR: 'encryption_error',
  INTEGRITY_CHECK_FAILURE: 'integrity_check_failure',
} as const;

// Security Event Severity Levels
export const SECURITY_SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Security Alert Thresholds
export const SECURITY_ALERT_THRESHOLDS = {
  AUTH_FAILURES_PER_MINUTE: 5,
  RATE_LIMIT_VIOLATIONS_PER_HOUR: 10,
  INPUT_VALIDATION_FAILURES_PER_MINUTE: 20,
  SUSPICIOUS_ACTIVITIES_PER_HOUR: 3,
} as const;

// File Upload Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

// Resume Constants
export const RESUME_SECTIONS = Object.freeze([
  'personalInfo',
  'summary',
  'workExperience',
  'education',
  'skills',
  'projects',
  'awardsCertifications',
]);

export const OPTIONAL_FIELDS = Object.freeze([
  'photos',
  'certifications',
  'hobbies',
  'references',
]);

/**
 * Cover Letter Templates
 *
 * Predefined templates for generating professional cover letters in different styles.
 * Each template is a function that takes cover letter data and returns a formatted string.
 *
 * Available templates:
 * - classic: Traditional cover letter format with standard business letter structure
 * - modern: Contemporary format with condensed header and professional styling
 *
 * Template data structure includes:
 * - Personal information (name, address, phone, email)
 * - Date and recipient details
 * - Company information
 * - Letter content (salutation, body, closing, signature)
 *
 * All templates ensure consistent formatting and professional appearance.
 */
export const COVER_LETTER_TEMPLATES = {
  classic: (data: {
    name: string;
    address: string;
    phone: string;
    email: string;
    date: string;
    recipientName: string;
    recipientTitle: string;
    companyName: string;
    companyAddress: string;
    salutation: string;
    body: string;
    closing: string;
    signature: string;
  }) => `${data.name}
${data.address}
${data.phone}
${data.email}

${data.date}

${data.recipientName}
${data.recipientTitle}
${data.companyName}
${data.companyAddress}

${data.salutation}

${data.body}

${data.closing}

${data.signature}`,

  modern: (data: {
    name: string;
    address: string;
    phone: string;
    email: string;
    date: string;
    recipientName: string;
    recipientTitle: string;
    companyName: string;
    companyAddress: string;
    salutation: string;
    body: string;
    closing: string;
    signature: string;
  }) => `[MODERN STYLE HEADER]

${data.name}
${data.address}
${data.phone} | ${data.email}

${data.date}

${data.recipientName}
${data.recipientTitle}
${data.companyName}
${data.companyAddress}

${data.salutation}

${data.body}

${data.closing}

${data.signature}

[END OF COVER LETTER]`,
} as const;

// Pagination Constants
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Rate Limiting Service Constants
export const RATE_LIMITING_SERVICE_URL = process.env.RATE_LIMITING_SERVICE_URL || 'http://rate-limiting-service:3004';
export const RATE_LIMITING_API_KEY = process.env.RATE_LIMITING_API_KEY || '';

// Time Constants
export const AUTOSAVE_DELAY = 1000; // 1 second
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds