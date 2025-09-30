/**
 * Unit Tests for Resume Model
 *
 * Tests Resume model encryption/decryption, validation, and database operations.
 */

/// <reference types="jest" />

import mongoose from 'mongoose';
import Resume, { IResume, IComment } from '../../../backend/models/Resume';

// Mock encryption functions
jest.mock('../../../backend/lib/encryption', () => ({
  encrypt: jest.fn((data) => `encrypted_${data}`),
  decrypt: jest.fn((data) => data.replace('encrypted_', '')),
}));

describe('Resume Model', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    testUserId = new mongoose.Types.ObjectId();
  });

  describe('Schema Validation', () => {
    it('should create a valid resume with required fields', async () => {
      const resumeData: Partial<IResume> = {
        title: 'Software Engineer Resume',
        content: 'Professional experience and skills',
        locale: 'en-US',
        userId: testUserId,
      };

      const resume = new Resume(resumeData);
      const savedResume = await resume.save();

      expect(savedResume.title).toBe(resumeData.title);
      expect(savedResume.content).toBe(resumeData.content);
      expect(savedResume.locale).toBe(resumeData.locale);
      expect(savedResume.version).toBe(1);
      expect(savedResume.userId.toString()).toBe(testUserId.toString());
      expect(savedResume.createdAt).toBeDefined();
      expect(savedResume.updatedAt).toBeDefined();
    });

    it('should fail validation without required fields', async () => {
      const resume = new Resume({});

      await expect(resume.save()).rejects.toThrow();
    });

    it('should enforce title length limit', async () => {
      const longTitle = 'A'.repeat(101);
      const resume = new Resume({
        title: longTitle,
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      await expect(resume.save()).rejects.toThrow('Title cannot be more than 100 characters');
    });

    it('should set default version to 1', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      const saved = await resume.save();
      expect(saved.version).toBe(1);
    });

    it('should accept optional fields', async () => {
      const resumeData = {
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
        photos: 'photo data',
        certifications: 'certification data',
        hobbies: 'hobby data',
        references: 'reference data',
      };

      const resume = new Resume(resumeData);
      const saved = await resume.save();

      expect(saved.photos).toBe(resumeData.photos);
      expect(saved.certifications).toBe(resumeData.certifications);
      expect(saved.hobbies).toBe(resumeData.hobbies);
      expect(saved.references).toBe(resumeData.references);
    });
  });

  describe('Encryption/Decryption', () => {
    let resume: any;

    beforeEach(async () => {
      const resumeData = {
        title: 'Test Resume',
        content: 'sensitive content',
        photos: 'sensitive photos',
        certifications: 'sensitive certs',
        hobbies: 'sensitive hobbies',
        references: 'sensitive refs',
        locale: 'en-US',
        userId: testUserId,
      };

      resume = new Resume(resumeData);
      await resume.save();
    });

    it('should encrypt sensitive fields before saving', async () => {
      // Check that the document in database has encrypted fields
      const rawDoc = await mongoose.connection.collection('resumes').findOne({ _id: resume._id });

      expect(rawDoc.content).toBe('encrypted_sensitive content');
      expect(rawDoc.photos).toBe('encrypted_sensitive photos');
      expect(rawDoc.certifications).toBe('encrypted_sensitive certs');
      expect(rawDoc.hobbies).toBe('encrypted_sensitive hobbies');
      expect(rawDoc.references).toBe('encrypted_sensitive refs');
    });

    it('should decrypt sensitive fields after finding', async () => {
      const foundResume = await Resume.findById(resume._id);

      expect(foundResume.content).toBe('sensitive content');
      expect(foundResume.photos).toBe('sensitive photos');
      expect(foundResume.certifications).toBe('sensitive certs');
      expect(foundResume.hobbies).toBe('sensitive hobbies');
      expect(foundResume.references).toBe('sensitive refs');
    });

    it('should decrypt fields in find results array', async () => {
      const resumes = await Resume.find({ userId: testUserId });

      expect(resumes).toHaveLength(1);
      expect(resumes[0].content).toBe('sensitive content');
      expect(resumes[0].photos).toBe('sensitive photos');
    });

    it('should encrypt fields during update operations', async () => {
      await Resume.findByIdAndUpdate(resume._id, {
        content: 'updated content',
        photos: 'updated photos',
      });

      const rawDoc = await mongoose.connection.collection('resumes').findOne({ _id: resume._id });
      expect(rawDoc.content).toBe('encrypted_updated content');
      expect(rawDoc.photos).toBe('encrypted_updated photos');
    });

    it('should decrypt fields after update operations', async () => {
      const updated = await Resume.findByIdAndUpdate(
        resume._id,
        { content: 'updated content' },
        { new: true }
      );

      expect(updated.content).toBe('updated content');
    });

    it('should handle $set updates with encryption', async () => {
      await Resume.findByIdAndUpdate(resume._id, {
        $set: { content: 'set content', photos: 'set photos' }
      });

      const rawDoc = await mongoose.connection.collection('resumes').findOne({ _id: resume._id });
      expect(rawDoc.content).toBe('encrypted_set content');
      expect(rawDoc.photos).toBe('encrypted_set photos');
    });

    it('should handle updateMany with encryption', async () => {
      await Resume.updateMany(
        { userId: testUserId },
        { content: 'bulk updated content' }
      );

      const rawDoc = await mongoose.connection.collection('resumes').findOne({ _id: resume._id });
      expect(rawDoc.content).toBe('encrypted_bulk updated content');
    });

    it('should handle findOneAndReplace with encryption', async () => {
      const replacement = {
        title: 'Replaced Resume',
        content: 'replaced content',
        photos: 'replaced photos',
        locale: 'en-US',
        userId: testUserId,
      };

      await Resume.findOneAndReplace({ _id: resume._id }, replacement);

      const rawDoc = await mongoose.connection.collection('resumes').findOne({ _id: resume._id });
      expect(rawDoc.content).toBe('encrypted_replaced content');
      expect(rawDoc.photos).toBe('encrypted_replaced photos');
    });

    it('should handle findOneAndDelete decryption', async () => {
      const deleted = await Resume.findOneAndDelete({ _id: resume._id });

      expect(deleted.content).toBe('sensitive content');
      expect(deleted.photos).toBe('sensitive photos');
    });
  });

  describe('Comments Subdocument', () => {
    it('should create resume with comments', async () => {
      const comments: IComment[] = [
        {
          field: 'experience',
          text: 'Great experience section',
          author: 'reviewer1',
        },
        {
          field: 'education',
          text: 'Education looks good',
          author: 'reviewer2',
        },
      ];

      const resume = new Resume({
        title: 'Resume with Comments',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
        comments,
      });

      const saved = await resume.save();

      expect(saved.comments).toHaveLength(2);
      expect(saved.comments[0].field).toBe('experience');
      expect(saved.comments[0].text).toBe('Great experience section');
      expect(saved.comments[0].author).toBe('reviewer1');
      expect(saved.comments[0].createdAt).toBeDefined();
      expect(saved.comments[0].updatedAt).toBeDefined();
    });

    it('should validate comment required fields', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
        comments: [{ field: 'test' }], // Missing text and author
      });

      await expect(resume.save()).rejects.toThrow();
    });

    it('should add comments to existing resume', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      await resume.save();

      resume.comments.push({
        field: 'summary',
        text: 'Good summary',
        author: 'reviewer',
      });

      await resume.save();

      const found = await Resume.findById(resume._id);
      expect(found.comments).toHaveLength(1);
      expect(found.comments[0].field).toBe('summary');
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes configured', async () => {
      const collection = mongoose.connection.collection('resumes');
      const indexes = await collection.indexes();

      // Check for locale index
      const localeIndex = indexes.find(idx => idx.name === 'locale_1');
      expect(localeIndex).toBeDefined();

      // Check for createdAt descending index
      const createdAtIndex = indexes.find(idx => idx.name === 'createdAt_-1');
      expect(createdAtIndex).toBeDefined();

      // Check for updatedAt descending index
      const updatedAtIndex = indexes.find(idx => idx.name === 'updatedAt_-1');
      expect(updatedAtIndex).toBeDefined();

      // Check for compound index
      const compoundIndex = indexes.find(idx => idx.name === 'locale_1_createdAt_-1');
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      const resumes = [
        {
          title: 'Resume 1',
          content: 'Content 1',
          locale: 'en-US',
          userId: testUserId,
        },
        {
          title: 'Resume 2',
          content: 'Content 2',
          locale: 'en-GB',
          userId: testUserId,
        },
        {
          title: 'Resume 3',
          content: 'Content 3',
          locale: 'en-US',
          userId: new mongoose.Types.ObjectId(), // Different user
        },
      ];

      await Resume.insertMany(resumes);
    });

    it('should filter by userId', async () => {
      const userResumes = await Resume.find({ userId: testUserId });
      expect(userResumes).toHaveLength(2);
    });

    it('should filter by locale', async () => {
      const usResumes = await Resume.find({ locale: 'en-US', userId: testUserId });
      expect(usResumes).toHaveLength(1);
      expect(usResumes[0].title).toBe('Resume 1');
    });

    it('should sort by createdAt descending', async () => {
      const resumes = await Resume.find({ userId: testUserId }).sort({ createdAt: -1 });
      expect(resumes).toHaveLength(2);
      expect(resumes[0].createdAt.getTime()).toBeGreaterThanOrEqual(resumes[1].createdAt.getTime());
    });

    it('should support compound queries', async () => {
      const resumes = await Resume.find({ locale: 'en-US', userId: testUserId })
        .sort({ createdAt: -1 });
      expect(resumes).toHaveLength(1);
    });
  });

  describe('Version Increment', () => {
    it('should increment version on updates', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      const saved = await resume.save();
      expect(saved.version).toBe(1);

      // Update the resume
      const updated = await Resume.findByIdAndUpdate(
        saved._id,
        { title: 'Updated Title' },
        { new: true }
      );

      expect(updated.version).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption/decryption errors gracefully', async () => {
      // Mock encryption to throw error
      const { encrypt } = require('../../../backend/lib/encryption');
      encrypt.mockImplementationOnce(() => {
        throw new Error('Encryption failed');
      });

      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      await expect(resume.save()).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors in post hooks', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: testUserId,
      });

      await resume.save();

      // Mock decryption to throw error
      const { decrypt } = require('../../../backend/lib/encryption');
      decrypt.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      // This should not throw, but log the error
      const found = await Resume.findById(resume._id);
      expect(found).toBeDefined();
    });
  });
});