/**
 * Unit tests for general validation functions
 *
 * Tests validation utilities including:
 * - Email validation
 * - Password strength validation
 * - Phone number validation
 * - URL validation and security
 * - String sanitization
 * - XSS and SQL injection detection
 * - File upload validation
 * - Resume model data validation
 */

import {
  validateEmail,
  validateEmailSecure,
  validatePassword,
  validatePhone,
  validateURL,
  validateLength,
  sanitizeString,
  detectSQLInjection,
  detectXSS,
  validateFileUpload,
  validateSecureInput,
  validateResumeModelData
} from '../validations';

describe('General Validations', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('test123@example.io')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.c')).toBe(true);
      expect(validateEmail('test@example')).toBe(false);
    });
  });

  describe('validateEmailSecure', () => {
    it('should validate secure emails', () => {
      expect(validateEmailSecure('test@example.com')).toBe(true);
      expect(validateEmailSecure('user.name@example.co.uk')).toBe(true);
    });

    it('should reject emails with security issues', () => {
      expect(validateEmailSecure('test@.com')).toBe(false);
      expect(validateEmailSecure('test..test@example.com')).toBe(false);
      expect(validateEmailSecure('test@example..com')).toBe(false);
      expect(validateEmailSecure('very.long.local.part@example.com')).toBe(false);
      expect(validateEmailSecure('test@very.long.domain.part.com')).toBe(false);
      expect(validateEmailSecure('test@<script>example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('MySecure@2023')).toBe(true);
      expect(validatePassword('Complex#Password$456')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('')).toBe(false);
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('nouppercase123!')).toBe(false);
      expect(validatePassword('NOLOWERCASE123!')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
      expect(validatePassword('NoSpecial123')).toBe(false);
      expect(validatePassword('weakpassword')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validatePassword('Exactly8Chars!')).toBe(true);
      expect(validatePassword('12345678Aa!')).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone formats', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1-234-567-890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('+')).toBe(false);
    });

    it('should handle international formats', () => {
      expect(validatePhone('+44 20 7123 4567')).toBe(true);
      expect(validatePhone('+91 9876543210')).toBe(true);
    });
  });

  describe('validateURL', () => {
    it('should validate safe URLs', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://example.com/path')).toBe(true);
      expect(validateURL('https://example.com:8080/path?query=value')).toBe(true);
    });

    it('should reject dangerous schemes', () => {
      expect(validateURL('javascript:alert(1)')).toBe(false);
      expect(validateURL('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(validateURL('vbscript:msgbox(1)')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(validateURL('')).toBe(false);
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('http://')).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate string length', () => {
      expect(validateLength('hello', 10)).toBe(true);
      expect(validateLength('hello', 5)).toBe(true);
      expect(validateLength('hello', 3)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateLength('', 0)).toBe(true);
      expect(validateLength('', 1)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('alert(1)');
      expect(sanitizeString('<b>Bold</b>')).toBe('Bold');
      expect(sanitizeString('<p>Paragraph</p>')).toBe('Paragraph');
    });

    it('should escape special characters', () => {
      expect(sanitizeString('&')).toBe('&');
      expect(sanitizeString('<')).toBe('<');
      expect(sanitizeString('>')).toBe('>');
      expect(sanitizeString('"')).toBe('"');
      expect(sanitizeString("'")).toBe('&#x27;');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });

    it('should preserve safe content', () => {
      expect(sanitizeString('Hello World 123')).toBe('Hello World 123');
      expect(sanitizeString('user@example.com')).toBe('user@example.com');
    });
  });

  describe('detectSQLInjection', () => {
    it('should detect SQL keywords', () => {
      expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
      expect(detectSQLInjection('INSERT INTO table VALUES')).toBe(true);
      expect(detectSQLInjection('DELETE FROM users WHERE')).toBe(true);
      expect(detectSQLInjection('UPDATE users SET')).toBe(true);
      expect(detectSQLInjection('DROP TABLE users')).toBe(true);
    });

    it('should not detect safe content', () => {
      expect(detectSQLInjection('This is a normal sentence.')).toBe(false);
      expect(detectSQLInjection('User selected option')).toBe(false);
      expect(detectSQLInjection('Please update your profile')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(detectSQLInjection('select * from users')).toBe(true);
      expect(detectSQLInjection('Select * From Users')).toBe(true);
    });
  });

  describe('detectXSS', () => {
    it('should detect script tags', () => {
      expect(detectXSS('<script>alert(1)</script>')).toBe(true);
      expect(detectXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(detectXSS('<img src=x onerror=alert(1)>')).toBe(true);
      expect(detectXSS('<div onclick=alert(1)>')).toBe(true);
    });

    it('should detect other dangerous tags', () => {
      expect(detectXSS('<iframe src="evil.com"></iframe>')).toBe(true);
      expect(detectXSS('<object data="evil.swf"></object>')).toBe(true);
      expect(detectXSS('<embed src="evil.swf">')).toBe(true);
    });

    it('should not detect safe content', () => {
      expect(detectXSS('Normal text content')).toBe(false);
      expect(detectXSS('<b>Bold text</b>')).toBe(false);
      expect(detectXSS('<p>Paragraph</p>')).toBe(false);
    });
  });

  describe('validateFileUpload', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const maxSize = 1024 * 1024; // 1MB

    it('should validate correct files', () => {
      const file = { type: 'image/jpeg', size: 500000 } as File;
      expect(validateFileUpload(file, allowedTypes, maxSize)).toBeNull();
    });

    it('should reject wrong file types', () => {
      const file = { type: 'text/plain', size: 1000 } as File;
      expect(validateFileUpload(file, allowedTypes, maxSize)).toBe('File type text/plain is not allowed. Allowed types: image/jpeg, image/png');
    });

    it('should reject files that are too large', () => {
      const file = { type: 'image/jpeg', size: maxSize + 1 } as File;
      expect(validateFileUpload(file, allowedTypes, maxSize)).toBe(`File size ${maxSize + 1} exceeds maximum allowed size of ${maxSize} bytes`);
    });

    it('should handle edge cases', () => {
      const emptyFile = { type: 'image/jpeg', size: 0 } as File;
      expect(validateFileUpload(emptyFile, allowedTypes, maxSize)).toBeNull();
    });
  });

  describe('validateSecureInput', () => {
    const schema = {
      name: { maxLength: 100 },
      email: { maxLength: 255 },
      message: { maxLength: 1000 }
    };

    it('should validate and sanitize safe input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello world'
      };

      const result = validateSecureInput(input, schema);

      expect(result).toEqual({});
      expect(input.name).toBe('John Doe');
      expect(input.email).toBe('john@example.com');
      expect(input.message).toBe('Hello world');
    });

    it('should detect and reject XSS', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'test@example.com',
        message: 'Hello'
      };

      const result = validateSecureInput(input, schema);

      expect(result.name).toBe('Input contains potentially malicious content');
    });

    it('should detect and reject SQL injection', () => {
      const input = {
        name: 'John Doe',
        email: 'test@example.com',
        message: 'SELECT * FROM users'
      };

      const result = validateSecureInput(input, schema);

      expect(result.message).toBe('Input contains potentially malicious content');
    });

    it('should sanitize HTML tags', () => {
      const input = {
        name: '<b>John Doe</b>',
        email: 'test@example.com',
        message: 'Hello <i>world</i>'
      };

      const result = validateSecureInput(input, schema);

      expect(result).toEqual({});
      expect(input.name).toBe('John Doe');
      expect(input.message).toBe('Hello world');
    });

    it('should validate length limits', () => {
      const input = {
        name: 'a'.repeat(101), // Exceeds maxLength of 100
        email: 'test@example.com',
        message: 'Hello'
      };

      const result = validateSecureInput(input, schema);

      expect(result.name).toBe('Input exceeds maximum length of 100 characters');
    });
  });

  describe('validateResumeModelData', () => {
    it('should validate correct resume data', () => {
      const data = {
        title: 'Software Engineer Resume',
        content: 'Resume content here',
        locale: 'en-US',
        version: 1
      };

      const result = validateResumeModelData(data);

      expect(result).toEqual({});
    });

    it('should reject missing required fields', () => {
      const data = {
        content: 'Resume content',
        locale: 'en-US'
      };

      const result = validateResumeModelData(data);

      expect(result.title).toBe('Title is required and must be a non-empty string');
    });

    it('should reject invalid title length', () => {
      const data = {
        title: 'a'.repeat(101), // Exceeds 100 chars
        content: 'Resume content',
        locale: 'en-US'
      };

      const result = validateResumeModelData(data);

      expect(result.title).toBe('Title cannot exceed 100 characters');
    });

    it('should reject invalid locale format', () => {
      const data = {
        title: 'Resume',
        content: 'Content',
        locale: 'invalid-locale'
      };

      const result = validateResumeModelData(data);

      expect(result.locale).toBe('Locale must be in format xx-XX (e.g., en-US)');
    });

    it('should reject invalid version', () => {
      const data = {
        title: 'Resume',
        content: 'Content',
        locale: 'en-US',
        version: 0
      };

      const result = validateResumeModelData(data);

      expect(result.version).toBe('Version must be a positive number');
    });

    it('should validate optional string fields', () => {
      const data = {
        title: 'Resume',
        content: 'Content',
        locale: 'en-US',
        photos: 'photo data',
        certifications: '<script>alert(1)</script>', // XSS attempt
        hobbies: 'reading, coding'
      };

      const result = validateResumeModelData(data);

      expect(result.certifications).toBe('certifications contains potentially malicious content');
      expect(result.photos).toBeUndefined(); // Valid
      expect(result.hobbies).toBeUndefined(); // Valid
    });

    it('should handle missing optional fields', () => {
      const data = {
        title: 'Resume',
        content: 'Content',
        locale: 'en-US'
      };

      const result = validateResumeModelData(data);

      expect(result).toEqual({});
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validatePassword(null as any)).toBe(false);
      expect(validatePhone(null as any)).toBe(false);
      expect(validateURL(null as any)).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      const result = validateSecureInput({}, {});
      expect(result).toEqual({});
    });

    it('should handle non-string values in secure input validation', () => {
      const input = {
        name: 123,
        email: true,
        message: {}
      };

      const result = validateSecureInput(input, {});

      expect(result).toEqual({});
      // Non-string values should be preserved
      expect(input.name).toBe(123);
      expect(input.email).toBe(true);
      expect(input.message).toEqual({});
    });
  });
});