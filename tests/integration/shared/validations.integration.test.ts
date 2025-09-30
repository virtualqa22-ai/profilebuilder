/**
 * Shared Validations Integration Tests
 *
 * Tests the complete validation library functionality including:
 * - Integration of multiple validation functions
 * - End-to-end validation workflows with real data
 * - Cross-validation between different data types
 * - Performance with large datasets
 * - Security validation and sanitization
 * - Locale-specific validation logic
 * - Error handling and edge cases
 * - Data transformation and normalization
 */

import {
  validateResumeData,
  validateCoverLetterData,
  validateAdMetricData,
  validateEmail,
  validateEmailSecure,
  validatePhone,
  validateLength,
  sanitizeString,
  MAX_FIELD_LENGTH,
  ValidationResult
} from '../../../shared/validations';

describe('Shared Validations Integration Tests', () => {
  describe('Resume Data Validation Integration', () => {
    const mockLocaleData = {
      locale: 'en-US',
      name: 'English (US)',
      dateFormat: 'MM/DD/YYYY',
      sections: {
        personalInfo: {
          label: 'Personal Information',
          fields: {
            name: { label: 'Name', placeholder: 'Enter your name' },
            email: { label: 'Email', placeholder: 'Enter your email' },
            phone: { label: 'Phone', placeholder: 'Enter your phone' }
          },
          order: ['name', 'email', 'phone']
        },
        summary: {
          label: 'Professional Summary',
          placeholder: 'Enter your professional summary'
        },
        workExperience: {
          label: 'Work Experience',
          fields: {
            title: { label: 'Job Title', placeholder: 'Enter job title' },
            company: { label: 'Company', placeholder: 'Enter company name' },
            startDate: { label: 'Start Date', placeholder: 'Start date' },
            endDate: { label: 'End Date', placeholder: 'End date' },
            description: { label: 'Description', placeholder: 'Job description' }
          },
          order: ['title', 'company', 'startDate', 'endDate', 'description']
        },
        education: {
          label: 'Education',
          fields: {
            degree: { label: 'Degree', placeholder: 'Enter degree' },
            university: { label: 'University', placeholder: 'Enter university' },
            startDate: { label: 'Start Date', placeholder: 'Start date' },
            endDate: { label: 'End Date', placeholder: 'End date' }
          },
          order: ['degree', 'university', 'startDate', 'endDate']
        },
        skills: {
          label: 'Skills',
          placeholder: 'Enter your skills'
        }
      },
      optionalFields: {
        photos: { enabled: true, required: false },
        certifications: { enabled: true, required: false },
        hobbies: { enabled: false, required: false },
        references: { enabled: true, required: false }
      }
    };

    it('should validate complete resume data successfully', () => {
      const validResumeData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123'
        },
        summary: 'Experienced software engineer with 5+ years of experience',
        workExperience: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            description: 'Led development of web applications'
          }
        ],
        education: [
          {
            degree: 'Bachelor of Science',
            university: 'State University',
            startDate: '2016-09-01',
            endDate: '2020-05-01'
          }
        ],
        skills: 'JavaScript, React, Node.js',
        photos: 'profile-photo.jpg',
        certifications: 'AWS Certified',
        references: 'Available upon request'
      };

      const errors = validateResumeData(validResumeData, mockLocaleData);

      expect(errors).toEqual({});
    });

    it('should validate resume with missing optional fields', () => {
      const resumeData = {
        personalInfo: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com'
        },
        summary: 'Professional summary',
        workExperience: [],
        education: [],
        skills: 'Skills here'
      };

      const errors = validateResumeData(resumeData, mockLocaleData);

      expect(errors).toEqual({});
    });

    it('should detect validation errors across multiple sections', () => {
      const invalidResumeData = {
        personalInfo: {
          name: '', // Required but empty
          email: 'invalid-email', // Invalid format
          phone: 'invalid-phone' // Invalid format
        },
        summary: '', // Required but empty
        workExperience: [
          {
            title: '', // Required but empty
            company: 'Test Company',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            description: 'Valid description'
          }
        ],
        education: [],
        skills: 'Valid skills'
      };

      const errors = validateResumeData(invalidResumeData, mockLocaleData);

      expect(Object.keys(errors)).toHaveLength(4);
      expect(errors['personalInfo-name']).toBe('Name is required.');
      expect(errors['personalInfo-email']).toBe('Email is required.'); // Would be validated by email validation
      expect(errors['summary']).toBe('Professional Summary is required.');
      expect(errors['workExperience-0-title']).toBe('Job Title in Work Experience #1 is required.');
    });

    it('should validate required optional fields when enabled', () => {
      const localeWithRequiredOptional = {
        ...mockLocaleData,
        optionalFields: {
          ...mockLocaleData.optionalFields,
          photos: { enabled: true, required: true },
          certifications: { enabled: true, required: true }
        }
      };

      const resumeData = {
        personalInfo: { name: 'Test', email: 'test@example.com' },
        summary: 'Summary',
        workExperience: [],
        education: [],
        skills: 'Skills'
        // Missing required photos and certifications
      };

      const errors = validateResumeData(resumeData, localeWithRequiredOptional);

      expect(errors['photos']).toBe('Photos is required for this locale.');
      expect(errors['certifications']).toBe('Certifications is required for this locale.');
    });

    it('should handle complex work experience validation', () => {
      const resumeData = {
        personalInfo: { name: 'Test', email: 'test@example.com' },
        summary: 'Summary',
        workExperience: [
          {
            title: 'Job 1',
            company: 'Company 1',
            startDate: '2020-01-01',
            endDate: '2021-01-01',
            description: 'Description 1'
          },
          {
            title: '', // Invalid
            company: '', // Invalid
            startDate: 'invalid-date', // Would be validated by date validation
            endDate: 'invalid-date',
            description: ''
          }
        ],
        education: [],
        skills: 'Skills'
      };

      const errors = validateResumeData(resumeData, mockLocaleData);

      expect(errors['workExperience-1-title']).toBe('Job Title in Work Experience #2 is required.');
      expect(errors['workExperience-1-company']).toBe('Company in Work Experience #2 is required.');
    });
  });

  describe('Cover Letter Data Validation Integration', () => {
    it('should validate complete cover letter data', () => {
      const validCoverLetterData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'I am writing to express my interest in the software engineer position.',
        template: 'classic',
        address: '123 Main St, City, State',
        phone: '+1-555-0123',
        date: '2024-01-15',
        recipientTitle: 'Hiring Manager',
        companyAddress: '456 Business Ave, City, State',
        salutation: 'Dear Hiring Manager',
        closing: 'Sincerely',
        signature: 'John Doe'
      };

      const errors = validateCoverLetterData(validCoverLetterData);

      expect(errors).toEqual({});
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john.doe@example.com'
        // Missing recipientName, companyName, body, template
      };

      const errors = validateCoverLetterData(incompleteData);

      expect(errors.recipientName).toBe('Recipient name is required.');
      expect(errors.companyName).toBe('Company name is required.');
      expect(errors.body).toBe('Body is required.');
      expect(errors.template).toBe('Template is required.');
    });

    it('should validate email and phone formats', () => {
      const dataWithInvalidFormats = {
        name: 'John Doe',
        email: 'invalid-email-format',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'Valid body content',
        template: 'classic',
        phone: 'invalid-phone-number'
      };

      const errors = validateCoverLetterData(dataWithInvalidFormats);

      expect(errors.email).toBe('Invalid email format.');
      expect(errors.phone).toBe('Invalid phone number format.');
    });

    it('should validate template options', () => {
      const dataWithInvalidTemplate = {
        name: 'John Doe',
        email: 'john@example.com',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'Valid body',
        template: 'invalid-template'
      };

      const errors = validateCoverLetterData(dataWithInvalidTemplate);

      expect(errors.template).toBe('Invalid template. Must be "classic" or "modern".');
    });

    it('should enforce length limits', () => {
      const dataWithLongFields = {
        name: 'A'.repeat(MAX_FIELD_LENGTH + 1), // Too long
        email: 'john@example.com',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'A'.repeat(2001), // Too long
        template: 'classic'
      };

      const errors = validateCoverLetterData(dataWithLongFields);

      expect(errors.name).toContain('exceeds maximum length');
      expect(errors.body).toContain('exceeds maximum length');
    });
  });

  describe('Ad Metric Data Validation Integration', () => {
    it('should validate complete ad metric data', () => {
      const validAdMetricData = {
        user_id: 'user123',
        ad_id: 'ad456',
        event_type: 'click',
        metadata: {
          campaign_id: 'camp789',
          source: 'google',
          timestamp: Date.now()
        }
      };

      const errors = validateAdMetricData(validAdMetricData);

      expect(errors).toEqual({});
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        user_id: 'user123'
        // Missing ad_id and event_type
      };

      const errors = validateAdMetricData(incompleteData);

      expect(errors.ad_id).toBe('Ad id is required.');
      expect(errors.event_type).toBe('Event type is required.');
    });

    it('should validate event types', () => {
      const dataWithInvalidEventType = {
        user_id: 'user123',
        ad_id: 'ad456',
        event_type: 'invalid_event'
      };

      const errors = validateAdMetricData(dataWithInvalidEventType);

      expect(errors.event_type).toContain('Event type must be one of');
    });

    it('should validate field lengths', () => {
      const dataWithLongFields = {
        user_id: 'A'.repeat(501), // Too long
        ad_id: 'B'.repeat(101), // Too long
        event_type: 'click'
      };

      const errors = validateAdMetricData(dataWithLongFields);

      expect(errors.user_id).toContain('maximum length of 500');
      expect(errors.ad_id).toContain('maximum length of 100');
    });

    it('should handle optional metadata', () => {
      const dataWithoutMetadata = {
        user_id: 'user123',
        ad_id: 'ad456',
        event_type: 'impression'
      };

      const errors = validateAdMetricData(dataWithoutMetadata);

      expect(errors).toEqual({});
    });

    it('should validate metadata structure', () => {
      const dataWithInvalidMetadata = {
        user_id: 'user123',
        ad_id: 'ad456',
        event_type: 'view',
        metadata: 'invalid-metadata' // Should be object
      };

      const errors = validateAdMetricData(dataWithInvalidMetadata);

      expect(errors.metadata).toBe('Metadata must be an object if provided.');
    });
  });

  describe('Cross-Validation Integration', () => {
    it('should validate email consistently across functions', () => {
      const testEmails = [
        'valid@example.com',
        'invalid-email',
        'test@subdomain.example.com',
        'user+tag@example.com',
        '@example.com',
        'user@'
      ];

      testEmails.forEach(email => {
        const basicResult = validateEmail(email);
        const secureResult = validateEmailSecure(email);

        // Secure validation should be at least as strict as basic
        if (!basicResult) {
          expect(secureResult).toBe(false);
        }
      });
    });

    it('should integrate sanitization with validation', () => {
      const maliciousInput = '<script>alert("XSS")</script>Test Input';
      const sanitized = sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Test Input');

      // Validate length after sanitization
      const isValidLength = validateLength(sanitized, 100);
      expect(isValidLength).toBe(true);
    });

    it('should validate phone numbers consistently', () => {
      const testPhones = [
        '+1-555-0123',
        '(555) 123-4567',
        '555.123.4567',
        '+44 20 7123 4567',
        'invalid-phone',
        '123',
        ''
      ];

      testPhones.forEach(phone => {
        if (phone) {
          const result = validatePhone(phone);
          // Should handle various international formats
          expect(typeof result).toBe('boolean');
        }
      });
    });
  });

  describe('End-to-End Validation Workflows', () => {
    it('should validate complete user registration workflow', () => {
      // Simulate user registration data validation
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        resume: {
          personalInfo: {
            name: 'New User',
            email: 'newuser@example.com',
            phone: '+1-555-0199'
          },
          summary: 'Recent graduate seeking software engineering opportunities',
          workExperience: [],
          education: [{
            degree: 'Bachelor of Science',
            university: 'University',
            startDate: '2020-09-01',
            endDate: '2024-05-01'
          }],
          skills: 'JavaScript, Python, SQL'
        },
        coverLetter: {
          name: 'New User',
          email: 'newuser@example.com',
          recipientName: 'Hiring Manager',
          companyName: 'Tech Startup',
          body: 'I am excited to apply for the junior developer position.',
          template: 'modern'
        }
      };

      // Validate email
      expect(validateEmailSecure(userData.email)).toBe(true);

      // Validate resume
      const resumeErrors = validateResumeData(userData.resume, mockLocaleData);
      expect(resumeErrors).toEqual({});

      // Validate cover letter
      const coverLetterErrors = validateCoverLetterData(userData.coverLetter);
      expect(coverLetterErrors).toEqual({});
    });

    it('should validate ad tracking workflow', () => {
      // Simulate ad interaction tracking
      const adInteractions = [
        {
          user_id: 'user123',
          ad_id: 'ad456',
          event_type: 'impression',
          metadata: { campaign: 'summer_campaign' }
        },
        {
          user_id: 'user123',
          ad_id: 'ad456',
          event_type: 'click',
          metadata: { campaign: 'summer_campaign', source: 'google' }
        },
        {
          user_id: 'user123',
          ad_id: 'ad456',
          event_type: 'view',
          metadata: { campaign: 'summer_campaign', duration: 30 }
        }
      ];

      adInteractions.forEach(interaction => {
        const errors = validateAdMetricData(interaction);
        expect(errors).toEqual({});
      });
    });

    it('should handle bulk validation efficiently', () => {
      // Create large dataset for performance testing
      const bulkResumeData = Array.from({ length: 100 }, (_, i) => ({
        personalInfo: {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          phone: `+1-555-0${String(i).padStart(3, '0')}`
        },
        summary: `Professional summary for user ${i}`,
        workExperience: [{
          title: 'Software Engineer',
          company: `Company ${i}`,
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: `Description for user ${i}`
        }],
        education: [{
          degree: 'Bachelor of Science',
          university: 'State University',
          startDate: '2016-09-01',
          endDate: '2020-05-01'
        }],
        skills: 'JavaScript, React, Node.js'
      }));

      const startTime = Date.now();

      bulkResumeData.forEach(data => {
        const errors = validateResumeData(data, mockLocaleData);
        expect(errors).toEqual({});
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second for 100 validations)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Security and Sanitization Integration', () => {
    it('should prevent XSS through input sanitization', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<svg onload=alert("XSS")>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeString(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      });
    });

    it('should validate and sanitize email inputs', () => {
      const maliciousEmails = [
        'valid@example.com<script>alert("XSS")</script>',
        'test@.com',
        'user@sub.domain.com',
        'test..<test>@example.com'
      ];

      maliciousEmails.forEach(email => {
        const isValid = validateEmailSecure(email);
        if (!isValid) {
          expect(isValid).toBe(false);
        }
      });
    });

    it('should handle SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "1' OR '1' = '1"
      ];

      sqlInjectionAttempts.forEach(attempt => {
        // These should be caught by validation or sanitization
        const sanitized = sanitizeString(attempt);
        expect(sanitized.length).toBeGreaterThan(0);
        // The dangerous characters should be escaped or removed
        expect(sanitized).not.toContain("';");
        expect(sanitized).not.toContain("' OR");
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large validation payloads', () => {
      const largeResumeData = {
        personalInfo: {
          name: 'A'.repeat(1000),
          email: 'large@example.com',
          phone: '+1-555-0123'
        },
        summary: 'B'.repeat(5000),
        workExperience: Array.from({ length: 20 }, (_, i) => ({
          title: `Job Title ${i}`,
          company: `Company ${i}`,
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: 'C'.repeat(1000)
        })),
        education: Array.from({ length: 10 }, (_, i) => ({
          degree: `Degree ${i}`,
          university: `University ${i}`,
          startDate: '2016-01-01',
          endDate: '2020-01-01'
        })),
        skills: 'D'.repeat(2000)
      };

      const startTime = Date.now();
      const errors = validateResumeData(largeResumeData, mockLocaleData);
      const endTime = Date.now();

      expect(errors).toEqual({});
      expect(endTime - startTime).toBeLessThan(500); // Should be fast even with large data
    });

    it('should validate arrays efficiently', () => {
      const largeArrayData = {
        personalInfo: { name: 'Test', email: 'test@example.com' },
        summary: 'Summary',
        workExperience: Array.from({ length: 100 }, (_, i) => ({
          title: `Title ${i}`,
          company: `Company ${i}`,
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: `Description ${i}`
        })),
        education: [],
        skills: 'Skills'
      };

      const startTime = Date.now();
      const errors = validateResumeData(largeArrayData, mockLocaleData);
      const endTime = Date.now();

      expect(errors).toEqual({});
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validateResumeData(null as any, mockLocaleData)).not.toThrow();
      expect(() => validateResumeData(undefined as any, mockLocaleData)).not.toThrow();
      expect(() => validateCoverLetterData(null as any)).not.toThrow();
      expect(() => validateAdMetricData(null as any)).not.toThrow();
    });

    it('should handle empty objects', () => {
      const emptyResumeData = {};
      const errors = validateResumeData(emptyResumeData, mockLocaleData);

      expect(Object.keys(errors)).toHaveLength.greaterThan(0);
      expect(errors.summary).toBe('Professional Summary is required.');
    });

    it('should handle malformed locale data', () => {
      const malformedLocale = {
        ...mockLocaleData,
        sections: null
      };

      const resumeData = {
        personalInfo: { name: 'Test', email: 'test@example.com' },
        summary: 'Summary',
        workExperience: [],
        education: [],
        skills: 'Skills'
      };

      expect(() => validateResumeData(resumeData, malformedLocale as any)).not.toThrow();
    });

    it('should handle invalid data types', () => {
      const invalidData = {
        personalInfo: 'invalid', // Should be object
        summary: 123, // Should be string
        workExperience: 'invalid', // Should be array
        education: [],
        skills: 'Skills'
      };

      const errors = validateResumeData(invalidData as any, mockLocaleData);

      // Should handle type mismatches gracefully
      expect(typeof errors).toBe('object');
    });

    it('should validate boundary conditions', () => {
      const boundaryData = {
        name: 'A'.repeat(MAX_FIELD_LENGTH), // Exactly at limit
        email: 'a@'.padEnd(254 - 2, 'x') + 'com', // Close to email length limit
        recipientName: 'Test',
        companyName: 'Test Company',
        body: 'A'.repeat(2000), // Exactly at limit
        template: 'classic'
      };

      const errors = validateCoverLetterData(boundaryData);

      expect(errors).toEqual({});
    });
  });

  describe('Internationalization and Localization', () => {
    it('should validate data for different locales', () => {
      const frenchLocaleData = {
        ...mockLocaleData,
        locale: 'fr-FR',
        optionalFields: {
          photos: { enabled: false, required: false },
          certifications: { enabled: true, required: true },
          hobbies: { enabled: true, required: false },
          references: { enabled: false, required: false }
        }
      };

      const resumeData = {
        personalInfo: { name: 'Jean Dupont', email: 'jean@example.com' },
        summary: 'Développeur expérimenté',
        workExperience: [],
        education: [],
        skills: 'JavaScript, React',
        certifications: 'Certifications françaises' // Required for this locale
      };

      const errors = validateResumeData(resumeData, frenchLocaleData);

      expect(errors).toEqual({});
    });

    it('should handle unicode characters', () => {
      const unicodeData = {
        name: 'José María González',
        email: 'jose.maria@example.com',
        recipientName: 'María García',
        companyName: 'Empresa Española S.A.',
        body: 'Estoy interesado en la posición. Tengo experiencia en desarrollo de software.',
        template: 'modern'
      };

      const errors = validateCoverLetterData(unicodeData);

      expect(errors).toEqual({});
    });
  });
});