/// <reference types="jest" />
import {
  MAX_TITLE_LENGTH,
  MAX_FIELD_LENGTH,
  DEFAULT_LOCALE,
  SECURITY_HEADERS,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  RESUME_SECTIONS,
  OPTIONAL_FIELDS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  AUTOSAVE_DELAY,
  SESSION_TIMEOUT,
} from '../../../backend/lib/constants';

describe('Constants Module', () => {

  describe('Validation Constants', () => {
    it('should have correct maximum title length', () => {
      expect(MAX_TITLE_LENGTH).toBe(100);
      expect(typeof MAX_TITLE_LENGTH).toBe('number');
      expect(MAX_TITLE_LENGTH).toBeGreaterThan(0);
    });

    it('should have correct maximum field length', () => {
      expect(MAX_FIELD_LENGTH).toBe(500);
      expect(typeof MAX_FIELD_LENGTH).toBe('number');
      expect(MAX_FIELD_LENGTH).toBeGreaterThan(MAX_TITLE_LENGTH);
    });
  });

  describe('API Constants', () => {
    it('should have correct default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en-US');
      expect(typeof DEFAULT_LOCALE).toBe('string');
      expect(DEFAULT_LOCALE).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });
  });

  describe('Security Headers', () => {
    it('should contain all required security headers', () => {
      expect(SECURITY_HEADERS).toHaveProperty('CONTENT_TYPE_OPTIONS');
      expect(SECURITY_HEADERS).toHaveProperty('FRAME_OPTIONS');
      expect(SECURITY_HEADERS).toHaveProperty('XSS_PROTECTION');
      expect(SECURITY_HEADERS).toHaveProperty('REFERRER_POLICY');
      expect(SECURITY_HEADERS).toHaveProperty('PERMISSIONS_POLICY');
      expect(SECURITY_HEADERS).toHaveProperty('HSTS');
    });

    it('should have correct security header values', () => {
      expect(SECURITY_HEADERS.CONTENT_TYPE_OPTIONS).toBe('nosniff');
      expect(SECURITY_HEADERS.FRAME_OPTIONS).toBe('SAMEORIGIN');
      expect(SECURITY_HEADERS.XSS_PROTECTION).toBe('1; mode=block');
      expect(SECURITY_HEADERS.REFERRER_POLICY).toBe('strict-origin-when-cross-origin');
      expect(SECURITY_HEADERS.PERMISSIONS_POLICY).toBe('geolocation=(), microphone=()');
      expect(SECURITY_HEADERS.HSTS).toBe('max-age=63072000; includeSubDomains; preload');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(SECURITY_HEADERS)).toBe(true);
    });
  });

  describe('File Upload Constants', () => {
    it('should have correct maximum file size', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
      expect(typeof MAX_FILE_SIZE).toBe('number');
      expect(MAX_FILE_SIZE).toBeGreaterThan(0);
    });

    it('should have correct allowed image types', () => {
      expect(ALLOWED_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/gif']);
      expect(Array.isArray(ALLOWED_IMAGE_TYPES)).toBe(true);
      expect(ALLOWED_IMAGE_TYPES.length).toBe(3);
    });

    it('should have correct allowed document types', () => {
      expect(ALLOWED_DOCUMENT_TYPES).toEqual(['application/pdf']);
      expect(Array.isArray(ALLOWED_DOCUMENT_TYPES)).toBe(true);
      expect(ALLOWED_DOCUMENT_TYPES.length).toBe(1);
    });

    it('should have valid MIME types', () => {
      const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
      allTypes.forEach(type => {
        expect(type).toMatch(/^[^/]+\/[^/]+$/);
      });
    });
  });

  describe('Resume Constants', () => {
    it('should have correct resume sections', () => {
      expect(RESUME_SECTIONS).toEqual([
        'personalInfo',
        'summary',
        'workExperience',
        'education',
        'skills',
        'projects',
        'awardsCertifications',
      ]);
      expect(Array.isArray(RESUME_SECTIONS)).toBe(true);
      expect(RESUME_SECTIONS.length).toBe(7);
    });

    it('should have correct optional fields', () => {
      expect(OPTIONAL_FIELDS).toEqual([
        'photos',
        'certifications',
        'hobbies',
        'references',
      ]);
      expect(Array.isArray(OPTIONAL_FIELDS)).toBe(true);
      expect(OPTIONAL_FIELDS.length).toBe(4);
    });

    it('should be frozen arrays (immutable)', () => {
      expect(Object.isFrozen(RESUME_SECTIONS)).toBe(true);
      expect(Object.isFrozen(OPTIONAL_FIELDS)).toBe(true);
    });
  });

  describe('Pagination Constants', () => {
    it('should have correct default page size', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(10);
      expect(typeof DEFAULT_PAGE_SIZE).toBe('number');
      expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    });

    it('should have correct maximum page size', () => {
      expect(MAX_PAGE_SIZE).toBe(100);
      expect(typeof MAX_PAGE_SIZE).toBe('number');
      expect(MAX_PAGE_SIZE).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    });
  });

  describe('Time Constants', () => {
    it('should have correct autosave delay', () => {
      expect(AUTOSAVE_DELAY).toBe(1000); // 1 second
      expect(typeof AUTOSAVE_DELAY).toBe('number');
      expect(AUTOSAVE_DELAY).toBeGreaterThan(0);
    });

    it('should have correct session timeout', () => {
      expect(SESSION_TIMEOUT).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
      expect(typeof SESSION_TIMEOUT).toBe('number');
      expect(SESSION_TIMEOUT).toBeGreaterThan(0);
      expect(SESSION_TIMEOUT).toBe(86400000); // Verify calculation
    });
  });

  describe('Constant Relationships', () => {
    it('should have logical relationships between constants', () => {
      expect(MAX_FIELD_LENGTH).toBeGreaterThan(MAX_TITLE_LENGTH);
      expect(MAX_PAGE_SIZE).toBeGreaterThanOrEqual(DEFAULT_PAGE_SIZE);
      expect(SESSION_TIMEOUT).toBeGreaterThan(AUTOSAVE_DELAY);
    });

    it('should have reasonable values', () => {
      expect(MAX_TITLE_LENGTH).toBeLessThanOrEqual(1000);
      expect(MAX_FIELD_LENGTH).toBeLessThanOrEqual(10000);
      expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100);
      expect(MAX_PAGE_SIZE).toBeLessThanOrEqual(1000);
      expect(AUTOSAVE_DELAY).toBeLessThanOrEqual(60000); // 1 minute
      expect(SESSION_TIMEOUT).toBeLessThanOrEqual(604800000); // 1 week
    });
  });

  describe('Constant Types', () => {
    it('should have correct types for all constants', () => {
      expect(typeof MAX_TITLE_LENGTH).toBe('number');
      expect(typeof MAX_FIELD_LENGTH).toBe('number');
      expect(typeof DEFAULT_LOCALE).toBe('string');
      expect(typeof SECURITY_HEADERS).toBe('object');
      expect(typeof MAX_FILE_SIZE).toBe('number');
      expect(Array.isArray(ALLOWED_IMAGE_TYPES)).toBe(true);
      expect(Array.isArray(ALLOWED_DOCUMENT_TYPES)).toBe(true);
      expect(Array.isArray(RESUME_SECTIONS)).toBe(true);
      expect(Array.isArray(OPTIONAL_FIELDS)).toBe(true);
      expect(typeof DEFAULT_PAGE_SIZE).toBe('number');
      expect(typeof MAX_PAGE_SIZE).toBe('number');
      expect(typeof AUTOSAVE_DELAY).toBe('number');
      expect(typeof SESSION_TIMEOUT).toBe('number');
    });
  });

  describe('Security Header Validation', () => {
    it('should have valid HSTS max-age', () => {
      const hstsValue = SECURITY_HEADERS.HSTS;
      const maxAgeMatch = hstsValue.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();
      const maxAge = parseInt(maxAgeMatch![1]);
      expect(maxAge).toBeGreaterThan(0);
      expect(maxAge).toBeLessThanOrEqual(63072000); // 2 years
    });

    it('should have valid XSS protection value', () => {
      expect(SECURITY_HEADERS.XSS_PROTECTION).toMatch(/^1; mode=block$/);
    });

    it('should have valid content type options', () => {
      expect(SECURITY_HEADERS.CONTENT_TYPE_OPTIONS).toBe('nosniff');
    });
  });

  describe('File Type Validation', () => {
    it('should not have overlapping file types', () => {
      const imageSet = new Set(ALLOWED_IMAGE_TYPES);
      const documentSet = new Set(ALLOWED_DOCUMENT_TYPES);

      // Check for no overlap
      for (const type of ALLOWED_DOCUMENT_TYPES) {
        expect(imageSet.has(type)).toBe(false);
      }
    });

    it('should have reasonable file size limits', () => {
      expect(MAX_FILE_SIZE).toBeGreaterThanOrEqual(1024 * 1024); // At least 1MB
      expect(MAX_FILE_SIZE).toBeLessThanOrEqual(100 * 1024 * 1024); // At most 100MB
    });
  });
});