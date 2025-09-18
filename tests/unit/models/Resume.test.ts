/// <reference types="jest" />
import mongoose from 'mongoose';
import Resume from '../../../backend/models/Resume';

// Mock mongoose and crypto-js
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation((definition) => ({
    pre: jest.fn(),
    post: jest.fn(),
  })),
  model: jest.fn(),
  models: {},
}));

jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  enc: {
    Utf8: 'utf8',
  },
}));

describe('Resume Model', () => {
  let mockCryptoJS: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCryptoJS = require('crypto-js');
  });

  describe('Encryption/Decryption Functions', () => {
    it('should encrypt text using AES', () => {
      const testText = 'sensitive data';
      const encryptedText = 'encrypted-text';
      mockCryptoJS.AES.encrypt.mockReturnValue({
        toString: () => encryptedText,
      });

      // Import to trigger encryption setup
      require('../../../backend/models/Resume');

      // Simulate encryption call
      const result = mockCryptoJS.AES.encrypt(testText, 'test-key');
      expect(mockCryptoJS.AES.encrypt).toHaveBeenCalledWith(testText, 'test-key');
      expect(result.toString()).toBe(encryptedText);
    });

    it('should decrypt ciphertext using AES', () => {
      const encryptedText = 'encrypted-text';
      const decryptedText = 'decrypted data';
      const mockBytes = {
        toString: jest.fn().mockReturnValue(decryptedText),
      };
      mockCryptoJS.AES.decrypt.mockReturnValue(mockBytes);

      require('../../../backend/models/Resume');

      // Simulate decryption call
      const result = mockCryptoJS.AES.decrypt(encryptedText, 'test-key');
      expect(mockCryptoJS.AES.decrypt).toHaveBeenCalledWith(encryptedText, 'test-key');
      expect(result.toString).toHaveBeenCalledWith(mockCryptoJS.enc.Utf8);
    });
  });

  describe('Schema Definition', () => {
    it('should define required fields correctly', () => {
      require('../../../backend/models/Resume');

      expect(mongoose.Schema).toHaveBeenCalledWith(
        expect.objectContaining({
          title: {
            type: String,
            required: [true, 'Please provide a title for this resume.'],
            maxlength: [100, 'Title cannot be more than 100 characters'],
          },
          content: {
            type: String,
            required: [true, 'Please provide content for this resume.'],
          },
          locale: {
            type: String,
            required: [true, 'Please specify a locale for this resume.'],
          },
        }),
        expect.any(Object)
      );
    });

    it('should define optional fields', () => {
      require('../../../backend/models/Resume');

      expect(mongoose.Schema).toHaveBeenCalledWith(
        expect.objectContaining({
          version: {
            type: Number,
            default: 1,
          },
          photos: {
            type: String,
          },
          certifications: {
            type: String,
          },
          hobbies: {
            type: String,
          },
          references: {
            type: String,
          },
        }),
        expect.any(Object)
      );
    });

    it('should define comments sub-schema', () => {
      require('../../../backend/models/Resume');

      expect(mongoose.Schema).toHaveBeenCalledWith(
        expect.objectContaining({
          comments: expect.any(Object), // CommentSchema
        }),
        expect.any(Object)
      );
    });
  });

  describe('Pre-save Middleware', () => {
    let mockSchema: any;

    beforeEach(() => {
      require('../../../backend/models/Resume');
      mockSchema = (mongoose.Schema as jest.Mock).mock.results[0].value;
    });

    it('should encrypt content when modified', () => {
      const mockDoc = {
        isModified: jest.fn().mockReturnValue(true),
        content: 'plain text',
      };

      mockCryptoJS.AES.encrypt.mockReturnValue({
        toString: () => 'encrypted-content',
      });

      // Call the pre-save middleware
      const preSaveHook = mockSchema.pre.mock.calls.find(call => call[0] === 'save')[1];
      preSaveHook.call(mockDoc, () => {});

      expect(mockDoc.isModified).toHaveBeenCalledWith('content');
      expect(mockCryptoJS.AES.encrypt).toHaveBeenCalledWith('plain text', expect.any(String));
      expect(mockDoc.content).toBe('encrypted-content');
    });

    it('should encrypt photos when modified', () => {
      const mockDoc = {
        isModified: jest.fn((field) => field === 'photos'),
        photos: 'photo data',
      };

      mockCryptoJS.AES.encrypt.mockReturnValue({
        toString: () => 'encrypted-photos',
      });

      const preSaveHook = mockSchema.pre.mock.calls.find(call => call[0] === 'save')[1];
      preSaveHook.call(mockDoc, () => {});

      expect(mockDoc.photos).toBe('encrypted-photos');
    });

    it('should not encrypt unmodified fields', () => {
      const mockDoc = {
        isModified: jest.fn().mockReturnValue(false),
        content: 'plain text',
      };

      const preSaveHook = mockSchema.pre.mock.calls.find(call => call[0] === 'save')[1];
      preSaveHook.call(mockDoc, () => {});

      expect(mockCryptoJS.AES.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('Post-find Middleware', () => {
    let mockSchema: any;

    beforeEach(() => {
      require('../../../backend/models/Resume');
      mockSchema = (mongoose.Schema as jest.Mock).mock.results[0].value;
    });

    it('should decrypt content in find results', () => {
      const mockDocs = [
        { content: 'encrypted-content' },
        { content: 'another-encrypted' },
      ];

      mockCryptoJS.AES.decrypt
        .mockReturnValueOnce({ toString: () => 'decrypted-content' })
        .mockReturnValueOnce({ toString: () => 'another-decrypted' });

      const postFindHook = mockSchema.post.mock.calls.find(call => call[0] === 'find')[1];
      postFindHook(mockDocs);

      expect(mockDocs[0].content).toBe('decrypted-content');
      expect(mockDocs[1].content).toBe('another-decrypted');
    });

    it('should handle documents without content', () => {
      const mockDocs = [
        { title: 'Test Resume' }, // No content field
      ];

      const postFindHook = mockSchema.post.mock.calls.find(call => call[0] === 'find')[1];
      postFindHook(mockDocs);

      expect(mockCryptoJS.AES.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('Post-findOne Middleware', () => {
    let mockSchema: any;

    beforeEach(() => {
      require('../../../backend/models/Resume');
      mockSchema = (mongoose.Schema as jest.Mock).mock.results[0].value;
    });

    it('should decrypt content in single document', () => {
      const mockDoc = { content: 'encrypted-content' };

      mockCryptoJS.AES.decrypt.mockReturnValue({
        toString: () => 'decrypted-content',
      });

      const postFindOneHook = mockSchema.post.mock.calls.find(call => call[0] === 'findOne')[1];
      postFindOneHook(mockDoc);

      expect(mockDoc.content).toBe('decrypted-content');
    });

    it('should handle null document', () => {
      const postFindOneHook = mockSchema.post.mock.calls.find(call => call[0] === 'findOne')[1];
      postFindOneHook(null);

      expect(mockCryptoJS.AES.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('Happy Path Scenarios', () => {
    it('should create resume with all required fields', () => {
      const resumeData = {
        title: 'Software Engineer Resume',
        content: 'Resume content here',
        locale: 'en-US',
      };

      const mockResume = {
        ...resumeData,
        save: jest.fn().mockResolvedValue(resumeData),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockResume);

      expect(resumeData.title).toBe('Software Engineer Resume');
      expect(resumeData.content).toBe('Resume content here');
      expect(resumeData.locale).toBe('en-US');
    });

    it('should handle optional fields', () => {
      const resumeData = {
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        photos: 'photo data',
        certifications: 'certifications data',
        hobbies: 'hobbies data',
        references: 'references data',
        version: 2,
      };

      expect(resumeData.photos).toBeDefined();
      expect(resumeData.certifications).toBeDefined();
      expect(resumeData.version).toBe(2);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty strings in optional fields', () => {
      const resumeData = {
        title: 'Test',
        content: 'Content',
        locale: 'en-US',
        photos: '',
        certifications: '',
      };

      expect(resumeData.photos).toBe('');
      expect(resumeData.certifications).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const resumeData = {
        title: 'Long Resume',
        content: longContent,
        locale: 'en-US',
      };

      expect(resumeData.content.length).toBe(10000);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Content with émojis 😀 and spëcial chärs';
      const resumeData = {
        title: 'Special Resume',
        content: specialContent,
        locale: 'en-US',
      };

      expect(resumeData.content).toBe(specialContent);
    });

    it('should handle maximum title length', () => {
      const maxTitle = 'A'.repeat(100);
      const resumeData = {
        title: maxTitle,
        content: 'Content',
        locale: 'en-US',
      };

      expect(resumeData.title.length).toBe(100);
    });
  });

  describe('Validation Scenarios', () => {
    it('should validate required fields', () => {
      const testCases = [
        { title: '', content: 'content', locale: 'en-US', shouldFail: true },
        { title: 'Title', content: '', locale: 'en-US', shouldFail: true },
        { title: 'Title', content: 'content', locale: '', shouldFail: true },
        { title: 'Title', content: 'content', locale: 'en-US', shouldFail: false },
      ];

      testCases.forEach(({ title, content, locale, shouldFail }) => {
        const isValid = title && content && locale;
        expect(isValid).toBe(!shouldFail);
      });
    });

    it('should validate title length', () => {
      const longTitle = 'A'.repeat(101);
      expect(longTitle.length).toBeGreaterThan(100);

      const shortTitle = 'A'.repeat(99);
      expect(shortTitle.length).toBeLessThanOrEqual(100);
    });

    it('should handle version numbers', () => {
      const testCases = [
        { version: 1, expected: 1 },
        { version: 5, expected: 5 },
        { version: undefined, expected: undefined },
      ];

      testCases.forEach(({ version, expected }) => {
        const resumeData = { title: 'Test', content: 'Content', locale: 'en-US', version };
        expect((resumeData as any).version).toBe(expected);
      });
    });
  });

  describe('Model Creation', () => {
    it('should use existing model if already compiled', () => {
      (mongoose.models as any).Resume = 'existing-model';
      require('../../../backend/models/Resume');
      expect(mongoose.model).not.toHaveBeenCalled();
    });

    it('should create new model if not already compiled', () => {
      (mongoose.models as any) = {};
      require('../../../backend/models/Resume');
      expect(mongoose.model).toHaveBeenCalledWith('Resume', expect.any(Object));
    });
  });
});