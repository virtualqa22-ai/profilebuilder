/// <reference types="jest" />
import {
  validateResumeData,
  validateFileUpload,
  validateEmail,
  validateLength
} from '../../../backend/lib/validations';

// Mock the localeService
jest.mock('../../../backend/lib/localeService', () => ({
  getLocaleByCode: jest.fn(),
}));

describe('Validation Functions', () => {
  describe('validateResumeData', () => {
    const mockLocale = {
      sections: {
        personalInfo: {
          fields: {
            name: { label: 'Name', optional: false },
            email: { label: 'Email', optional: false },
          },
          order: ['name', 'email'],
        },
        summary: {
          placeholder: 'Enter your professional summary',
          optional: false,
        },
        workExperience: {
          fields: {
            company: { label: 'Company', optional: false },
            position: { label: 'Position', optional: false },
          },
          order: ['company', 'position'],
        },
        education: {
          fields: {
            institution: { label: 'Institution', optional: false },
            degree: { label: 'Degree', optional: false },
          },
          order: ['institution', 'degree'],
        },
      },
      optionalFields: {
        photos: { enabled: true, required: false },
        certifications: { enabled: true, required: true },
      },
    };

    beforeEach(() => {
      const mockLocaleService = require('../../../backend/lib/localeService');
      mockLocaleService.getLocaleByCode.mockReturnValue(mockLocale);
    });

    it('should return no errors for valid resume data', () => {
      const validData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        summary: 'Professional summary here',
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
          },
        ],
        education: [
          {
            institution: 'University',
            degree: 'Bachelor',
          },
        ],
      };

      const errors = validateResumeData(validData, mockLocale);
      expect(errors).toEqual({});
    });

    it('should return errors for missing required fields', () => {
      const invalidData = {
        personalInfo: {
          name: '', // Empty required field
          // Missing email
        },
        // Missing summary
        workExperience: [
          {
            company: '', // Empty required field
            position: 'Developer',
          },
        ],
        education: [], // Empty array
      };

      const errors = validateResumeData(invalidData, mockLocale);
      expect(Object.keys(errors)).toContain('personalInfo-name');
      expect(Object.keys(errors)).toContain('personalInfo-email');
      expect(Object.keys(errors)).toContain('summary');
      expect(Object.keys(errors)).toContain('workExperience-0-company');
    });

    it('should validate work experience array items', () => {
      const dataWithInvalidWorkExp = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        summary: 'Summary',
        workExperience: [
          { company: 'Valid Company', position: '' }, // Missing position
          { company: '', position: 'Valid Position' }, // Missing company
        ],
        education: [{ institution: 'University', degree: 'Bachelor' }],
      };

      const errors = validateResumeData(dataWithInvalidWorkExp, mockLocale);
      expect(errors['workExperience-0-position']).toBeDefined();
      expect(errors['workExperience-1-company']).toBeDefined();
    });

    it('should validate education array items', () => {
      const dataWithInvalidEducation = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        summary: 'Summary',
        workExperience: [{ company: 'Company', position: 'Position' }],
        education: [
          { institution: 'Valid University', degree: '' }, // Missing degree
          { institution: '', degree: 'Valid Degree' }, // Missing institution
        ],
      };

      const errors = validateResumeData(dataWithInvalidEducation, mockLocale);
      expect(errors['education-0-degree']).toBeDefined();
      expect(errors['education-1-institution']).toBeDefined();
    });

    it('should validate optional fields when required by locale', () => {
      const dataWithoutRequiredOptional = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        summary: 'Summary',
        workExperience: [{ company: 'Company', position: 'Position' }],
        education: [{ institution: 'University', degree: 'Bachelor' }],
        // Missing certifications which is required by locale
      };

      const errors = validateResumeData(dataWithoutRequiredOptional, mockLocale);
      expect(errors.certifications).toBe('Certifications is required for this locale.');
    });

    it('should handle empty work experience array', () => {
      const dataWithEmptyArrays = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        summary: 'Summary',
        workExperience: [],
        education: [],
      };

      const errors = validateResumeData(dataWithEmptyArrays, mockLocale);
      expect(Object.keys(errors)).not.toContain('workExperience');
      expect(Object.keys(errors)).not.toContain('education');
    });

    it('should handle missing optional sections', () => {
      const minimalValidData = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        summary: 'Summary',
      };

      const errors = validateResumeData(minimalValidData, mockLocale);
      expect(errors).toEqual({});
    });
  });

  describe('validateFileUpload', () => {
    it('should return null for valid file', () => {
      const validFile = {
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      } as File;

      const result = validateFileUpload(validFile, ['image/jpeg', 'image/png'], 5 * 1024 * 1024);
      expect(result).toBeNull();
    });

    it('should return error for invalid file type', () => {
      const invalidFile = {
        type: 'text/plain',
        size: 1024,
      } as File;

      const result = validateFileUpload(invalidFile, ['image/jpeg', 'image/png'], 5 * 1024 * 1024);
      expect(result).toContain('File type text/plain is not allowed');
    });

    it('should return error for file too large', () => {
      const largeFile = {
        type: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
      } as File;

      const result = validateFileUpload(largeFile, ['image/jpeg'], 5 * 1024 * 1024);
      expect(result).toContain('File size 10485760 exceeds maximum allowed size');
    });

    it('should handle exact size limit', () => {
      const exactSizeFile = {
        type: 'image/jpeg',
        size: 5 * 1024 * 1024, // Exactly 5MB
      } as File;

      const result = validateFileUpload(exactSizeFile, ['image/jpeg'], 5 * 1024 * 1024);
      expect(result).toBeNull();
    });

    it('should handle zero byte files', () => {
      const emptyFile = {
        type: 'image/jpeg',
        size: 0,
      } as File;

      const result = validateFileUpload(emptyFile, ['image/jpeg'], 1024);
      expect(result).toBeNull(); // Zero bytes should be valid if type is correct
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@gmail.com',
        'user@subdomain.domain.com',
        '123@test.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@.com',
        'test@example.',
        'test @example.com',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.c')).toBe(true); // Minimal valid email
      expect(validateEmail('test@example.com.')).toBe(false); // Trailing dot
      expect(validateEmail('test..test@example.com')).toBe(false); // Consecutive dots
    });
  });

  describe('validateLength', () => {
    it('should return true for strings within limit', () => {
      expect(validateLength('Hello', 10)).toBe(true);
      expect(validateLength('Hello', 5)).toBe(true);
      expect(validateLength('', 5)).toBe(true);
    });

    it('should return false for strings exceeding limit', () => {
      expect(validateLength('Hello World', 5)).toBe(false);
      expect(validateLength('A'.repeat(101), 100)).toBe(false);
    });

    it('should handle exact length match', () => {
      expect(validateLength('Hello', 5)).toBe(true);
      expect(validateLength('A'.repeat(100), 100)).toBe(true);
    });

    it('should handle zero limit', () => {
      expect(validateLength('', 0)).toBe(true);
      expect(validateLength('A', 0)).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicodeString = 'Hello 世界 🌍';
      expect(validateLength(unicodeString, 20)).toBe(true);
      expect(validateLength(unicodeString, 5)).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate complete resume with file upload', () => {
      const resumeData = {
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
        summary: 'Professional summary',
        workExperience: [{ company: 'Tech Corp', position: 'Developer' }],
        education: [{ institution: 'University', degree: 'Bachelor' }],
      };

      const mockLocale = {
        sections: {
          personalInfo: {
            fields: { name: { optional: false }, email: { optional: false } },
            order: ['name', 'email'],
          },
          summary: { optional: false },
          workExperience: {
            fields: { company: { optional: false }, position: { optional: false } },
            order: ['company', 'position'],
          },
          education: {
            fields: { institution: { optional: false }, degree: { optional: false } },
            order: ['institution', 'degree'],
          },
        },
      };

      const resumeErrors = validateResumeData(resumeData, mockLocale);
      expect(resumeErrors).toEqual({});

      // Test file validation separately
      const validFile = { type: 'image/jpeg', size: 1024 * 1024 } as File;
      const fileError = validateFileUpload(validFile, ['image/jpeg'], 2 * 1024 * 1024);
      expect(fileError).toBeNull();
    });

    it('should handle complex validation scenarios', () => {
      // Test email validation with various formats
      expect(validateEmail('complex.email+tag@example.co.uk')).toBe(true);

      // Test length validation with edge cases
      expect(validateLength('A'.repeat(1000), 1000)).toBe(true);
      expect(validateLength('A'.repeat(1001), 1000)).toBe(false);
    });
  });
});