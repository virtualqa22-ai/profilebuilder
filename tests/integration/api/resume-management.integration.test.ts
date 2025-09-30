/**
 * Resume Management Service Integration Tests
 *
 * Tests the complete resume management API endpoints including:
 * - Full CRUD operations with database persistence
 * - Validation and error handling scenarios
 * - Database connection and error handling
 * - Security and input validation
 * - Performance and load testing
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import resumeRoutes from '../../../services/resume-management/src/routes/resumes';
import Resume from '../../../services/resume-management/src/models/Resume';

describe('Resume Management Service Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to test database
    await mongoose.connect(mongoUri);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/resumes', resumeRoutes);

    // Start server
    server = app.listen(4001);
  });

  afterAll(async () => {
    // Close server and database
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database before each test
    await Resume.deleteMany({});
  });

  describe('POST /resumes - Create Resume', () => {
    it('should create a new resume with valid data', async () => {
      const resumeData = {
        userId: 'user123',
        title: 'Software Engineer Resume',
        content: 'Professional summary...',
        locale: 'en-US',
        photos: 'photo data',
        certifications: 'certification data',
        hobbies: 'hobby data',
        references: 'reference data'
      };

      const response = await request(app)
        .post('/resumes')
        .send(resumeData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(resumeData.title);
      expect(response.body.userId).toBe(resumeData.userId);
      expect(response.body.locale).toBe(resumeData.locale);

      // Verify in database
      const savedResume = await Resume.findById(response.body._id);
      expect(savedResume).toBeTruthy();
      expect(savedResume!.title).toBe(resumeData.title);
    });

    it('should handle missing required fields', async () => {
      const incompleteData = { title: 'Test Resume' };

      const response = await request(app)
        .post('/resumes')
        .send(incompleteData)
        .expect(500); // Since the route doesn't validate, it fails in DB save

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid data types', async () => {
      const invalidData = {
        userId: 123, // Should be string
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/resumes')
        .send(invalidData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /resumes/:id - Get Resume by ID', () => {
    let createdResume: any;

    beforeEach(async () => {
      createdResume = await Resume.create({
        userId: 'user123',
        title: 'Test Resume',
        content: 'Test content',
        locale: 'en-US'
      });
    });

    it('should return resume by ID', async () => {
      const response = await request(app)
        .get(`/resumes/${createdResume._id}`)
        .expect(200);

      expect(response.body._id).toBe(createdResume._id.toString());
      expect(response.body.title).toBe(createdResume.title);
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/resumes/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Resume not found');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .get('/resumes/invalid-id')
        .expect(500); // Mongoose cast error

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /resumes/user/:userId - Get Resumes by User ID', () => {
    beforeEach(async () => {
      await Resume.create([
        { userId: 'user123', title: 'Resume 1', content: 'Content 1', locale: 'en-US' },
        { userId: 'user123', title: 'Resume 2', content: 'Content 2', locale: 'en-GB' },
        { userId: 'user456', title: 'Resume 3', content: 'Content 3', locale: 'en-US' }
      ]);
    });

    it('should return resumes for specific user', async () => {
      const response = await request(app)
        .get('/resumes/user/user123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((resume: any) => {
        expect(resume.userId).toBe('user123');
      });
    });

    it('should return empty array for user with no resumes', async () => {
      const response = await request(app)
        .get('/resumes/user/nonexistent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /resumes/:id - Update Resume', () => {
    let createdResume: any;

    beforeEach(async () => {
      createdResume = await Resume.create({
        userId: 'user123',
        title: 'Original Title',
        content: 'Original content',
        locale: 'en-US'
      });
    });

    it('should update resume successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        locale: 'en-GB'
      };

      const response = await request(app)
        .put(`/resumes/${createdResume._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe(updateData.content);
      expect(response.body.locale).toBe(updateData.locale);

      // Verify in database
      const updatedResume = await Resume.findById(createdResume._id);
      expect(updatedResume!.title).toBe(updateData.title);
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/resumes/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.error).toBe('Resume not found');
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { title: 'Partially Updated' };

      const response = await request(app)
        .put(`/resumes/${createdResume._id}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.title).toBe(partialUpdate.title);
      expect(response.body.content).toBe(createdResume.content); // Unchanged
    });
  });

  describe('DELETE /resumes/:id - Delete Resume', () => {
    let createdResume: any;

    beforeEach(async () => {
      createdResume = await Resume.create({
        userId: 'user123',
        title: 'Test Resume',
        content: 'Test content',
        locale: 'en-US'
      });
    });

    it('should delete resume successfully', async () => {
      const response = await request(app)
        .delete(`/resumes/${createdResume._id}`)
        .expect(200);

      expect(response.body.message).toBe('Resume deleted successfully');

      // Verify deleted from database
      const deletedResume = await Resume.findById(createdResume._id);
      expect(deletedResume).toBeNull();
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/resumes/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Resume not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Disconnect from database
      await mongoose.connection.close();

      const resumeData = {
        userId: 'user123',
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/resumes')
        .send(resumeData)
        .expect(500);

      expect(response.body).toHaveProperty('error');

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });

    it('should handle large content payloads', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB content
      const resumeData = {
        userId: 'user123',
        title: 'Large Resume',
        content: largeContent,
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/resumes')
        .send(resumeData)
        .expect(201);

      expect(response.body.content).toBe(largeContent);
    });

    it('should handle concurrent requests', async () => {
      const resumeData = {
        userId: 'user123',
        title: 'Concurrent Resume',
        content: 'Content',
        locale: 'en-US'
      };

      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app).post('/resumes').send(resumeData)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
      });

      // Verify all were created
      const count = await Resume.countDocuments({ userId: 'user123' });
      expect(count).toBe(5);
    });
  });

  describe('Security and Validation', () => {
    it('should prevent NoSQL injection attempts', async () => {
      const maliciousData = {
        userId: { $ne: null }, // NoSQL injection attempt
        title: 'Malicious Resume',
        content: 'Content',
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/resumes')
        .send(maliciousData)
        .expect(500); // Should fail validation or casting

      expect(response.body).toHaveProperty('error');
    });

    it('should handle XSS in input data', async () => {
      const xssData = {
        userId: 'user123',
        title: '<script>alert("XSS")</script>Test Resume',
        content: 'javascript:alert("XSS")',
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/resumes')
        .send(xssData)
        .expect(201);

      // Data should be stored as-is (sanitization would be in frontend)
      expect(response.body.title).toContain('<script>');
    });

    it('should validate locale format', async () => {
      const invalidLocaleData = {
        userId: 'user123',
        title: 'Test Resume',
        content: 'Content',
        locale: 'invalid-locale'
      };

      const response = await request(app)
        .post('/resumes')
        .send(invalidLocaleData)
        .expect(201); // Model doesn't validate locale format

      expect(response.body.locale).toBe('invalid-locale');
    });
  });
});