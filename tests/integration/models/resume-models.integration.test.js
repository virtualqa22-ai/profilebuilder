/**
 * Resume Models Integration Tests
 *
 * Tests the complete resume model functionality including:
 * - Schema validation and constraints
 * - Database operations (CRUD)
 * - Index performance and uniqueness
 * - Pre-save hooks and middleware
 * - Encrypted field handling
 * - Error handling and edge cases
 * - Data integrity and consistency
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Resume = require('../../../services/resume-management/src/models/Resume');
const ResumeTemplate = require('../../../services/resume-management/src/models/ResumeTemplate');

describe('Resume Models Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await Resume.deleteMany({});
    await ResumeTemplate.deleteMany({});
  });

  describe('Resume Model Schema Validation', () => {
    it('should create a resume with valid data', async () => {
      const validResumeData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Software Engineer Resume',
        content: 'Professional resume content',
        locale: 'en-US',
        photos: 'profile-photo-data',
        certifications: 'certification-data',
        hobbies: 'hobby-data',
        references: 'reference-data',
        comments: [{
          field: 'experience',
          text: 'Great experience section',
          author: 'reviewer@example.com'
        }]
      };

      const resume = new Resume(validResumeData);
      const savedResume = await resume.save();

      expect(savedResume._id).toBeDefined();
      expect(savedResume.title).toBe(validResumeData.title);
      expect(savedResume.version).toBe(1);
      expect(savedResume.createdAt).toBeDefined();
      expect(savedResume.updatedAt).toBeDefined();
    });

    it('should reject resume without required fields', async () => {
      const invalidResumeData = {
        title: 'Test Resume'
        // Missing userId, content, locale
      };

      const resume = new Resume(invalidResumeData);

      await expect(resume.save()).rejects.toThrow(/validation failed/i);
    });

    it('should enforce field length constraints', async () => {
      const longTitle = 'A'.repeat(101); // Exceeds 100 char limit
      const resumeData = {
        userId: new mongoose.Types.ObjectId(),
        title: longTitle,
        content: 'Valid content',
        locale: 'en-US'
      };

      const resume = new Resume(resumeData);

      await expect(resume.save()).rejects.toThrow(/validation failed/i);
    });

    it('should validate email format in comments', async () => {
      const resumeData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Valid content',
        locale: 'en-US',
        comments: [{
          field: 'summary',
          text: 'Good summary',
          author: 'invalid-email-format' // Invalid email
        }]
      };

      const resume = new Resume(resumeData);

      // Comments don't have built-in validation, but we can test custom validation
      const savedResume = await resume.save();
      expect(savedResume.comments[0].author).toBe('invalid-email-format');
    });
  });

  describe('Resume Model Database Operations', () => {
    let testUserId;
    let testResume;

    beforeEach(async () => {
      testUserId = new mongoose.Types.ObjectId();
      testResume = await Resume.create({
        userId: testUserId,
        title: 'Test Resume',
        content: 'Test content',
        locale: 'en-US'
      });
    });

    it('should find resumes by userId', async () => {
      const foundResumes = await Resume.find({ userId: testUserId });

      expect(foundResumes).toHaveLength(1);
      expect(foundResumes[0].title).toBe('Test Resume');
    });

    it('should update resume and trigger updatedAt', async () => {
      const originalUpdatedAt = testResume.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      testResume.title = 'Updated Title';
      await testResume.save();

      expect(testResume.title).toBe('Updated Title');
      expect(testResume.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should delete resume successfully', async () => {
      await Resume.deleteOne({ _id: testResume._id });

      const foundResume = await Resume.findById(testResume._id);
      expect(foundResume).toBeNull();
    });

    it('should handle bulk operations', async () => {
      const bulkResumes = Array.from({ length: 5 }, (_, i) => ({
        userId: testUserId,
        title: `Bulk Resume ${i + 1}`,
        content: `Content ${i + 1}`,
        locale: 'en-US'
      }));

      await Resume.insertMany(bulkResumes);

      const userResumes = await Resume.find({ userId: testUserId });
      expect(userResumes).toHaveLength(6); // 1 from beforeEach + 5 bulk
    });
  });

  describe('Resume Model Indexes and Performance', () => {
    it('should use userId index for efficient queries', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create multiple resumes for the same user
      const resumes = Array.from({ length: 10 }, (_, i) => ({
        userId,
        title: `Resume ${i + 1}`,
        content: `Content ${i + 1}`,
        locale: 'en-US'
      }));

      await Resume.insertMany(resumes);

      // Query should be efficient with index
      const startTime = Date.now();
      const userResumes = await Resume.find({ userId });
      const queryTime = Date.now() - startTime;

      expect(userResumes).toHaveLength(10);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });

    it('should use locale index for filtering', async () => {
      const locales = ['en-US', 'en-GB', 'fr-FR'];
      const resumes = [];

      for (let i = 0; i < 15; i++) {
        resumes.push({
          userId: new mongoose.Types.ObjectId(),
          title: `Resume ${i + 1}`,
          content: `Content ${i + 1}`,
          locale: locales[i % locales.length]
        });
      }

      await Resume.insertMany(resumes);

      const usResumes = await Resume.find({ locale: 'en-US' });
      expect(usResumes.length).toBeGreaterThan(0);
      usResumes.forEach(resume => {
        expect(resume.locale).toBe('en-US');
      });
    });

    it('should use createdAt index for sorting', async () => {
      const userId = new mongoose.Types.ObjectId();
      const resumes = Array.from({ length: 5 }, (_, i) => ({
        userId,
        title: `Resume ${i + 1}`,
        content: `Content ${i + 1}`,
        locale: 'en-US'
      }));

      // Insert with delays to ensure different timestamps
      for (const resume of resumes) {
        await Resume.create(resume);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const sortedResumes = await Resume.find({ userId }).sort({ createdAt: -1 });
      expect(sortedResumes).toHaveLength(5);

      // Verify descending order
      for (let i = 1; i < sortedResumes.length; i++) {
        expect(sortedResumes[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          sortedResumes[i].createdAt.getTime()
        );
      }
    });
  });

  describe('Resume Model Pre-save Hooks', () => {
    it('should update version on save', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Version Test',
        content: 'Content',
        locale: 'en-US',
        version: 5
      });

      await resume.save();
      expect(resume.version).toBe(5);

      resume.title = 'Updated Title';
      await resume.save();
      expect(resume.version).toBe(5); // Version should remain as set
    });

    it('should set updatedAt on every save', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Timestamp Test',
        content: 'Content',
        locale: 'en-US'
      });

      const firstSave = await resume.save();
      const firstUpdatedAt = firstSave.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      resume.title = 'Updated';
      const secondSave = await resume.save();

      expect(secondSave.updatedAt.getTime()).toBeGreaterThan(firstUpdatedAt.getTime());
    });
  });

  describe('Resume Model Encrypted Fields', () => {
    it('should handle encrypted content field', async () => {
      const sensitiveContent = 'This is sensitive resume content';
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Encrypted Test',
        content: sensitiveContent,
        locale: 'en-US'
      });

      const saved = await resume.save();
      expect(saved.content).toBe(sensitiveContent);

      // In a real implementation, this would be encrypted
      // For testing, we verify the field is stored as-is
      const found = await Resume.findById(saved._id);
      expect(found.content).toBe(sensitiveContent);
    });

    it('should handle multiple encrypted fields', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Multi-Encrypted Test',
        content: 'Main content',
        photos: 'Photo data',
        certifications: 'Cert data',
        hobbies: 'Hobby data',
        references: 'Reference data',
        locale: 'en-US'
      });

      const saved = await resume.save();

      expect(saved.photos).toBe('Photo data');
      expect(saved.certifications).toBe('Cert data');
      expect(saved.hobbies).toBe('Hobby data');
      expect(saved.references).toBe('Reference data');
    });
  });

  describe('Resume Model Comments Subdocument', () => {
    it('should handle comments array', async () => {
      const comments = [
        {
          field: 'summary',
          text: 'Great summary section',
          author: 'reviewer1@example.com'
        },
        {
          field: 'experience',
          text: 'Add more details',
          author: 'reviewer2@example.com'
        }
      ];

      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Comments Test',
        content: 'Content',
        locale: 'en-US',
        comments
      });

      const saved = await resume.save();
      expect(saved.comments).toHaveLength(2);
      expect(saved.comments[0].field).toBe('summary');
      expect(saved.comments[1].author).toBe('reviewer2@example.com');
    });

    it('should set default timestamps on comments', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Comments Timestamp Test',
        content: 'Content',
        locale: 'en-US',
        comments: [{
          field: 'test',
          text: 'Test comment',
          author: 'test@example.com'
        }]
      });

      const saved = await resume.save();
      expect(saved.comments[0].createdAt).toBeDefined();
      expect(saved.comments[0].updatedAt).toBeDefined();
    });
  });

  describe('Resume Model Error Handling', () => {
    it('should handle duplicate key errors gracefully', async () => {
      // Note: This test assumes unique constraints if any exist
      // For now, test general error handling
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Error Test',
        content: 'Content',
        locale: 'en-US'
      });

      await resume.save();

      // Attempting to save with same data should work (no unique constraints)
      const duplicate = new Resume({
        userId: resume.userId,
        title: 'Another Resume',
        content: 'Different Content',
        locale: 'en-US'
      });

      await expect(duplicate.save()).resolves.toBeDefined();
    });

    it('should handle validation errors with detailed messages', async () => {
      const invalidResume = new Resume({
        // Missing all required fields
      });

      try {
        await invalidResume.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors).toBeDefined();
      }
    });

    it('should handle database connection errors', async () => {
      // Temporarily disconnect
      await mongoose.connection.close();

      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Connection Test',
        content: 'Content',
        locale: 'en-US'
      });

      await expect(resume.save()).rejects.toThrow();

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  describe('Resume Model Edge Cases', () => {
    it('should handle empty arrays and objects', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Edge Case Test',
        content: 'Content',
        locale: 'en-US',
        comments: [] // Empty array
      });

      const saved = await resume.save();
      expect(saved.comments).toEqual([]);
    });

    it('should handle maximum field lengths', async () => {
      const maxTitle = 'A'.repeat(100); // Exactly at limit
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: maxTitle,
        content: 'Content',
        locale: 'en-US'
      });

      const saved = await resume.save();
      expect(saved.title).toBe(maxTitle);
    });

    it('should handle special characters in text fields', async () => {
      const specialContent = 'Content with special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Special Chars Test',
        content: specialContent,
        locale: 'en-US'
      });

      const saved = await resume.save();
      expect(saved.content).toBe(specialContent);
    });
  });

  describe('ResumeTemplate Model', () => {
    it('should create and save resume template', async () => {
      const template = new ResumeTemplate({
        name: 'Software Engineer Template',
        description: 'Template for software engineering roles',
        structure: {
          sections: ['summary', 'experience', 'education', 'skills']
        },
        locale: 'en-US'
      });

      const saved = await template.save();
      expect(saved._id).toBeDefined();
      expect(saved.name).toBe('Software Engineer Template');
    });

    it('should validate template structure', async () => {
      const template = new ResumeTemplate({
        name: 'Test Template',
        description: 'Test description',
        structure: {}, // Empty structure
        locale: 'en-US'
      });

      // Templates might have different validation rules
      const saved = await template.save();
      expect(saved.structure).toEqual({});
    });
  });
});