/**
 * Centralized Messages and Alerts
 *
 * Contains all user-facing messages, error messages, validation messages, and alerts
 * to ensure consistency and ease of maintenance.
 */

// Error Messages
export const ERROR_MESSAGES = {
  MONGODB_URI_MISSING: 'Please define the MONGODB_URI environment variable inside .env.local',
  TITLE_REQUIRED: 'Please provide a title for this resume.',
  TITLE_TOO_LONG: 'Title cannot be more than 100 characters',
  CONTENT_REQUIRED: 'Please provide content for this resume.',
  LOCALE_REQUIRED: 'Please specify a locale for this resume.',
  INVALID_LOCALE: 'Invalid locale provided',
  FIELD_REQUIRED: (field: string) => `${field} is required.`,
  FIELD_TOO_LONG: (field: string, max: number) => `${field} cannot be more than ${max} characters`,
  UPLOAD_FAILED: 'Upload failed',
  PDF_GENERATION_FAILED: 'Failed to generate PDF',
  IMPORT_FAILED: 'Failed to import resume',
  AUTH_FAILED: 'Authentication failed',
  DATABASE_ERROR: 'Database operation failed',
  VALIDATION_ERROR: 'Validation failed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PDF_GENERATED: 'PDF generated successfully!',
  RESUME_IMPORTED: 'Resume imported successfully!',
  RESUME_SAVED: 'Resume saved successfully!',
  UPLOAD_SUCCESS: 'File uploaded successfully!',
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required.`,
  REQUIRED_IN_SECTION: (field: string, section: string, index: number) => `${field} in ${section} #${index + 1} is required.`,
  REQUIRED_FOR_LOCALE: (field: string) => `${field} is required for this locale.`,
} as const;

// Alert Messages
export const ALERT_MESSAGES = {
  SAVE_ERROR: 'Error saving resume!',
  UPLOAD_ERROR: 'Upload failed',
  IMPORT_ERROR: 'An error occurred during import',
  GENERATION_ERROR: 'An error occurred during PDF generation',
} as const;

// Info Messages
export const INFO_MESSAGES = {
  SAVING: 'Saving...',
  SAVED: 'Saved!',
  LOADING_LOCALE: 'Loading locale data...',
} as const;