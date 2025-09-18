/// <reference types="jest" />
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
  ALERT_MESSAGES,
  INFO_MESSAGES
} from '../../../backend/lib/messages';

describe('Messages Module', () => {
  describe('ERROR_MESSAGES', () => {
    it('should contain all required error message constants', () => {
      expect(ERROR_MESSAGES).toHaveProperty('MONGODB_URI_MISSING');
      expect(ERROR_MESSAGES).toHaveProperty('TITLE_REQUIRED');
      expect(ERROR_MESSAGES).toHaveProperty('TITLE_TOO_LONG');
      expect(ERROR_MESSAGES).toHaveProperty('CONTENT_REQUIRED');
      expect(ERROR_MESSAGES).toHaveProperty('LOCALE_REQUIRED');
      expect(ERROR_MESSAGES).toHaveProperty('INVALID_LOCALE');
      expect(ERROR_MESSAGES).toHaveProperty('UPLOAD_FAILED');
      expect(ERROR_MESSAGES).toHaveProperty('PDF_GENERATION_FAILED');
      expect(ERROR_MESSAGES).toHaveProperty('IMPORT_FAILED');
      expect(ERROR_MESSAGES).toHaveProperty('AUTH_FAILED');
      expect(ERROR_MESSAGES).toHaveProperty('DATABASE_ERROR');
      expect(ERROR_MESSAGES).toHaveProperty('VALIDATION_ERROR');
    });

    it('should have correct error message content', () => {
      expect(ERROR_MESSAGES.MONGODB_URI_MISSING).toBe('Please define the MONGODB_URI environment variable inside .env.local');
      expect(ERROR_MESSAGES.TITLE_REQUIRED).toBe('Please provide a title for this resume.');
      expect(ERROR_MESSAGES.TITLE_TOO_LONG).toBe('Title cannot be more than 100 characters');
      expect(ERROR_MESSAGES.CONTENT_REQUIRED).toBe('Please provide content for this resume.');
      expect(ERROR_MESSAGES.LOCALE_REQUIRED).toBe('Please specify a locale for this resume.');
      expect(ERROR_MESSAGES.INVALID_LOCALE).toBe('Invalid locale provided');
    });

    it('should have functional error messages', () => {
      expect(typeof ERROR_MESSAGES.FIELD_REQUIRED).toBe('function');
      expect(typeof ERROR_MESSAGES.FIELD_TOO_LONG).toBe('function');

      expect(ERROR_MESSAGES.FIELD_REQUIRED('email')).toBe('email is required.');
      expect(ERROR_MESSAGES.FIELD_TOO_LONG('name', 50)).toBe('name cannot be more than 50 characters');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(ERROR_MESSAGES)).toBe(true);
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should contain all required success message constants', () => {
      expect(SUCCESS_MESSAGES).toHaveProperty('PDF_GENERATED');
      expect(SUCCESS_MESSAGES).toHaveProperty('RESUME_IMPORTED');
      expect(SUCCESS_MESSAGES).toHaveProperty('RESUME_SAVED');
      expect(SUCCESS_MESSAGES).toHaveProperty('UPLOAD_SUCCESS');
    });

    it('should have correct success message content', () => {
      expect(SUCCESS_MESSAGES.PDF_GENERATED).toBe('PDF generated successfully!');
      expect(SUCCESS_MESSAGES.RESUME_IMPORTED).toBe('Resume imported successfully!');
      expect(SUCCESS_MESSAGES.RESUME_SAVED).toBe('Resume saved successfully!');
      expect(SUCCESS_MESSAGES.UPLOAD_SUCCESS).toBe('File uploaded successfully!');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(SUCCESS_MESSAGES)).toBe(true);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should contain all required validation message functions', () => {
      expect(VALIDATION_MESSAGES).toHaveProperty('REQUIRED_FIELD');
      expect(VALIDATION_MESSAGES).toHaveProperty('REQUIRED_IN_SECTION');
      expect(VALIDATION_MESSAGES).toHaveProperty('REQUIRED_FOR_LOCALE');
    });

    it('should generate correct validation messages', () => {
      expect(VALIDATION_MESSAGES.REQUIRED_FIELD('email')).toBe('email is required.');
      expect(VALIDATION_MESSAGES.REQUIRED_IN_SECTION('position', 'workExperience', 1)).toBe('position in workExperience #2 is required.');
      expect(VALIDATION_MESSAGES.REQUIRED_FOR_LOCALE('summary')).toBe('summary is required for this locale.');
    });

    it('should handle edge cases in validation messages', () => {
      expect(VALIDATION_MESSAGES.REQUIRED_FIELD('')).toBe(' is required.');
      expect(VALIDATION_MESSAGES.REQUIRED_IN_SECTION('', '', 0)).toBe(' in  #1 is required.');
      expect(VALIDATION_MESSAGES.REQUIRED_IN_SECTION('field', 'section', -1)).toBe('field in section #0 is required.');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(VALIDATION_MESSAGES)).toBe(true);
    });
  });

  describe('ALERT_MESSAGES', () => {
    it('should contain all required alert message constants', () => {
      expect(ALERT_MESSAGES).toHaveProperty('SAVE_ERROR');
      expect(ALERT_MESSAGES).toHaveProperty('UPLOAD_ERROR');
      expect(ALERT_MESSAGES).toHaveProperty('IMPORT_ERROR');
      expect(ALERT_MESSAGES).toHaveProperty('GENERATION_ERROR');
    });

    it('should have correct alert message content', () => {
      expect(ALERT_MESSAGES.SAVE_ERROR).toBe('Error saving resume!');
      expect(ALERT_MESSAGES.UPLOAD_ERROR).toBe('Upload failed');
      expect(ALERT_MESSAGES.IMPORT_ERROR).toBe('An error occurred during import');
      expect(ALERT_MESSAGES.GENERATION_ERROR).toBe('An error occurred during PDF generation');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(ALERT_MESSAGES)).toBe(true);
    });
  });

  describe('INFO_MESSAGES', () => {
    it('should contain all required info message constants', () => {
      expect(INFO_MESSAGES).toHaveProperty('SAVING');
      expect(INFO_MESSAGES).toHaveProperty('SAVED');
      expect(INFO_MESSAGES).toHaveProperty('LOADING_LOCALE');
    });

    it('should have correct info message content', () => {
      expect(INFO_MESSAGES.SAVING).toBe('Saving...');
      expect(INFO_MESSAGES.SAVED).toBe('Saved!');
      expect(INFO_MESSAGES.LOADING_LOCALE).toBe('Loading locale data...');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(INFO_MESSAGES)).toBe(true);
    });
  });

  describe('Message Consistency', () => {
    it('should have consistent message structure', () => {
      // All message objects should be objects
      expect(typeof ERROR_MESSAGES).toBe('object');
      expect(typeof SUCCESS_MESSAGES).toBe('object');
      expect(typeof VALIDATION_MESSAGES).toBe('object');
      expect(typeof ALERT_MESSAGES).toBe('object');
      expect(typeof INFO_MESSAGES).toBe('object');

      // None should be null or undefined
      expect(ERROR_MESSAGES).not.toBeNull();
      expect(SUCCESS_MESSAGES).not.toBeNull();
      expect(VALIDATION_MESSAGES).not.toBeNull();
      expect(ALERT_MESSAGES).not.toBeNull();
      expect(INFO_MESSAGES).not.toBeNull();
    });

    it('should not have empty messages', () => {
      const allMessages = [
        ...Object.values(ERROR_MESSAGES),
        ...Object.values(SUCCESS_MESSAGES),
        ...Object.values(ALERT_MESSAGES),
        ...Object.values(INFO_MESSAGES),
      ];

      allMessages.forEach(message => {
        if (typeof message === 'string') {
          expect(message.trim()).not.toBe('');
          expect(message.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have proper message formatting', () => {
      // Error messages should end with appropriate punctuation
      Object.values(ERROR_MESSAGES).forEach(message => {
        if (typeof message === 'string') {
          expect(message).toMatch(/[.!?]$/);
        }
      });

      // Success messages should end with exclamation
      Object.values(SUCCESS_MESSAGES).forEach(message => {
        expect(message).toMatch(/!$/);
      });
    });
  });

  describe('Functional Messages', () => {
    it('should handle various input types for functional messages', () => {
      // Test FIELD_REQUIRED with different inputs
      expect(ERROR_MESSAGES.FIELD_REQUIRED('name')).toBe('name is required.');
      expect(ERROR_MESSAGES.FIELD_REQUIRED('email')).toBe('email is required.');
      expect(ERROR_MESSAGES.FIELD_REQUIRED('phone')).toBe('phone is required.');

      // Test FIELD_TOO_LONG with different inputs
      expect(ERROR_MESSAGES.FIELD_TOO_LONG('title', 100)).toBe('title cannot be more than 100 characters');
      expect(ERROR_MESSAGES.FIELD_TOO_LONG('description', 500)).toBe('description cannot be more than 500 characters');
    });

    it('should handle edge cases in functional messages', () => {
      expect(() => ERROR_MESSAGES.FIELD_REQUIRED(null as any)).not.toThrow();
      expect(() => ERROR_MESSAGES.FIELD_TOO_LONG(undefined as any, 100)).not.toThrow();
      expect(() => ERROR_MESSAGES.FIELD_TOO_LONG('field', NaN)).not.toThrow();
    });
  });

  describe('Message Categories', () => {
    it('should have distinct message categories', () => {
      const errorKeys = Object.keys(ERROR_MESSAGES);
      const successKeys = Object.keys(SUCCESS_MESSAGES);
      const validationKeys = Object.keys(VALIDATION_MESSAGES);
      const alertKeys = Object.keys(ALERT_MESSAGES);
      const infoKeys = Object.keys(INFO_MESSAGES);

      // Check for no overlap between categories
      const allKeys = [...errorKeys, ...successKeys, ...validationKeys, ...alertKeys, ...infoKeys];
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it('should have appropriate number of messages per category', () => {
      expect(Object.keys(ERROR_MESSAGES).length).toBeGreaterThan(10);
      expect(Object.keys(SUCCESS_MESSAGES).length).toBeGreaterThan(3);
      expect(Object.keys(VALIDATION_MESSAGES).length).toBeGreaterThan(2);
      expect(Object.keys(ALERT_MESSAGES).length).toBeGreaterThan(3);
      expect(Object.keys(INFO_MESSAGES).length).toBeGreaterThan(2);
    });
  });
});