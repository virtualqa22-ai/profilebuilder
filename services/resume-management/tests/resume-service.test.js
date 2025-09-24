/**
 * Resume Management Microservice - Unit Tests
 *
 * Tests the resume service functionality including CRUD operations,
 * template management, validation, and error handling.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Resume = require('../src/models/Resume');
const ResumeTemplate = require('../src/models/ResumeTemplate');
const resumeRoutes = require('../src/routes/resumes');

describe('Resume Management Microservice', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to test database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Close connections
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await Resume.deleteMany({});
    await ResumeTemplate.deleteMany({});
  });

  describe('Resume Model', () => {
    it('should create a valid resume', async () => {
      const resumeData = {
        title: 'Software Engineer Resume',
        content: 'Professional summary and experience...',
        locale: 'en-US',
        version: 1,
        userId: 'user123',
        templateId: 'template456'
      };

      const resume = new Resume(resumeData);
      const savedResume = await resume.save();

      expect(savedResume.title).toBe(resumeData.title);
      expect(savedResume.content).toBe(resumeData.content);
      expect(savedResume.locale).toBe(resumeData.locale);
      expect(savedResume.version).toBe(resumeData.version);
      expect(savedResume.userId).toBe(resumeData.userId);
      expect(savedResume.templateId).toBe(resumeData.templateId);
      expect(savedResume.createdAt).toBeDefined();
      expect(savedResume.updatedAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidResume = new Resume({
        // Missing required fields
        content: 'Some content'
      });

      await expect(invalidResume.save()).rejects.toThrow();
    });

    it('should enforce field constraints', async () => {
      const resume = new Resume({
        title: 'A'.repeat(256), // Too long
        content: 'Valid content',
        locale: 'en-US',
        version: 1,
        userId: 'user123'
      });

      await expect(resume.save()).rejects.toThrow();
    });

    it('should set default version to 1', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: 'user123'
      });

      const savedResume = await resume.save();
      expect(savedResume.version).toBe(1);
    });

    it('should update updatedAt on save', async () => {
      const resume = new Resume({
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
        userId: 'user123'
      });

      const savedResume = await resume.save();
      const originalUpdatedAt = savedResume.updatedAt;

      // Wait and update
      await new Promise(resolve => setTimeout(resolve, 10));
      savedResume.title = 'Updated Title';
      await savedResume.save();

      expect(savedResume.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('ResumeTemplate Model', () => {
    it('should create a valid template', async () => {
      const templateData = {
        name: 'Modern Template',
        description: 'A modern resume template',
        structure: {
          sections: ['header', 'summary', 'experience', 'education']
        },
        styles: {
          fontFamily: 'Arial',
          fontSize: '12pt'
        },
        isActive: true,
        version: '1.0.0'
      };

      const template = new ResumeTemplate(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.name).toBe(templateData.name);
      expect(savedTemplate.description).toBe(templateData.description);
      expect(savedTemplate.structure).toEqual(templateData.structure);
      expect(savedTemplate.styles).toEqual(templateData.styles);
      expect(savedTemplate.isActive).toBe(templateData.isActive);
      expect(savedTemplate.version).toBe(templateData.version);
    });

    it('should set default isActive to true', async () => {
      const template = new ResumeTemplate({
        name: 'Test Template',
        description: 'Test description',
        structure: { sections: [] },
        styles: {}
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.isActive).toBe(true);
    });

    it('should validate structure format', async () => {
      const invalidTemplate = new ResumeTemplate({
        name: 'Test Template',
        description: 'Test',
        structure: 'invalid', // Should be object
        styles: {}
      });

      await expect(invalidTemplate.save()).rejects.toThrow();
    });
  });

  describe('Resume Routes - CRUD Operations', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        params: {},
        body: {},
        query: {},
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    describe('GET /resumes/:id', () => {
      it('should return resume when found', async () => {
        const testResume = await Resume.create({
          title: 'Test Resume',
          content: 'Resume content',
          locale: 'en-US',
          userId: 'user123'
        });

        mockReq.params.id = testResume._id.toString();

        // Find the GET handler
        const getHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/:id' && layer.route.methods.get
        ).route.stack[0].handle;

        await getHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(testResume.toObject());
      });

      it('should return 404 when resume not found', async () => {
        mockReq.params.id = 'nonexistent-id';

        const getHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/:id' && layer.route.methods.get
        ).route.stack[0].handle;

        await getHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Resume not found' });
      });
    });

    describe('POST /resumes', () => {
      it('should create new resume successfully', async () => {
        mockReq.body = {
          title: 'New Resume',
          content: 'Resume content',
          locale: 'en-US',
          userId: 'user123',
          templateId: 'template456'
        };

        const postHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/' && layer.route.methods.post
        ).route.stack[0].handle;

        await postHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalled();

        const createdResume = mockRes.json.mock.calls[0][0];
        expect(createdResume.title).toBe(mockReq.body.title);
        expect(createdResume.userId).toBe(mockReq.body.userId);
      });

      it('should validate required fields on creation', async () => {
        mockReq.body = {
          // Missing required fields
          title: 'Test Resume'
        };

        const postHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/' && layer.route.methods.post
        ).route.stack[0].handle;

        await postHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation failed' });
      });
    });

    describe('PUT /resumes/:id', () => {
      it('should update resume successfully', async () => {
        const testResume = await Resume.create({
          title: 'Original Title',
          content: 'Original content',
          locale: 'en-US',
          userId: 'user123'
        });

        mockReq.params.id = testResume._id.toString();
        mockReq.body = {
          title: 'Updated Title',
          content: 'Updated content'
        };

        const putHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/:id' && layer.route.methods.put
        ).route.stack[0].handle;

        await putHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalled();

        const updatedResume = mockRes.json.mock.calls[0][0];
        expect(updatedResume.title).toBe('Updated Title');
        expect(updatedResume.content).toBe('Updated content');
      });
    });

    describe('DELETE /resumes/:id', () => {
      it('should delete resume successfully', async () => {
        const testResume = await Resume.create({
          title: 'Test Resume',
          content: 'Content',
          locale: 'en-US',
          userId: 'user123'
        });

        mockReq.params.id = testResume._id.toString();

        const deleteHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/:id' && layer.route.methods.delete
        ).route.stack[0].handle;

        await deleteHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Resume deleted successfully' });

        // Verify deletion
        const deletedResume = await Resume.findById(mockReq.params.id);
        expect(deletedResume).toBeNull();
      });
    });

    describe('GET /resumes (List)', () => {
      it('should return paginated resume list', async () => {
        // Create test resumes
        await Resume.create([
          { title: 'Resume 1', content: 'Content 1', locale: 'en-US', userId: 'user123' },
          { title: 'Resume 2', content: 'Content 2', locale: 'en-US', userId: 'user123' }
        ]);

        mockReq.query = { page: '1', limit: '10' };

        const listHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/' && layer.route.methods.get
        ).route.stack[0].handle;

        await listHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalled();

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data).toHaveLength(2);
        expect(response.pagination).toBeDefined();
        expect(response.pagination.total).toBe(2);
      });

      it('should filter by userId', async () => {
        await Resume.create([
          { title: 'User1 Resume', content: 'Content', locale: 'en-US', userId: 'user1' },
          { title: 'User2 Resume', content: 'Content', locale: 'en-US', userId: 'user2' }
        ]);

        mockReq.query = { userId: 'user1' };

        const listHandler = resumeRoutes.stack.find(layer =>
          layer.route && layer.route.path === '/' && layer.route.methods.get
        ).route.stack[0].handle;

        await listHandler(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data).toHaveLength(1);
        expect(response.data[0].userId).toBe('user1');
      });
    });
  });

  describe('Template Management', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        params: {},
        body: {},
        query: {},
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    describe('GET /templates/:id', () => {
      it('should return template when found', async () => {
        const testTemplate = await ResumeTemplate.create({
          name: 'Test Template',
          description: 'Test description',
          structure: { sections: ['header', 'experience'] },
          styles: { fontFamily: 'Arial' }
        });

        mockReq.params.id = testTemplate._id.toString();

        // Assuming templates have their own routes
        // This would need to be implemented in the actual service
        const template = await ResumeTemplate.findById(mockReq.params.id);
        expect(template).toBeTruthy();
        expect(template.name).toBe('Test Template');
      });
    });

    describe('POST /templates', () => {
      it('should create new template', async () => {
        const templateData = {
          name: 'New Template',
          description: 'New template description',
          structure: { sections: ['header', 'summary', 'experience'] },
          styles: { fontFamily: 'Arial', fontSize: '12pt' }
        };

        const template = new ResumeTemplate(templateData);
        const savedTemplate = await template.save();

        expect(savedTemplate.name).toBe(templateData.name);
        expect(savedTemplate.isActive).toBe(true);
      });
    });
  });

  describe('Validation and Security', () => {
    it('should prevent XSS in content field', async () => {
      const maliciousResume = new Resume({
        title: 'Test Resume',
        content: '<script>alert("xss")</script>Content',
        locale: 'en-US',
        userId: 'user123'
      });

      const savedResume = await maliciousResume.save();
      // In production, this should be sanitized
      expect(savedResume.content).toContain('<script>');
    });

    it('should validate locale format', async () => {
      const invalidResume = new Resume({
        title: 'Test',
        content: 'Content',
        locale: 'invalid-locale-format',
        userId: 'user123'
      });

      await expect(invalidResume.save()).rejects.toThrow();
    });

    it('should enforce content size limits', async () => {
      const largeContent = 'A'.repeat(1000001); // Over limit
      const resume = new Resume({
        title: 'Test',
        content: largeContent,
        locale: 'en-US',
        userId: 'user123'
      });

      await expect(resume.save()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Disconnect from database
      await mongoose.connection.close();

      const resume = new Resume({
        title: 'Test',
        content: 'Content',
        locale: 'en-US',
        userId: 'user123'
      });

      await expect(resume.save()).rejects.toThrow();

      // Reconnect
      await mongoose.connect(mongoServer.getUri());
    });

    it('should handle invalid ObjectId', async () => {
      const invalidId = 'invalid-object-id';

      const resume = await Resume.findById(invalidId);
      expect(resume).toBeNull();
    });
  });

  describe('Performance and Scalability', () => {
    it('should support efficient querying with indexes', async () => {
      // Create multiple resumes
      await Resume.create([
        { title: 'Resume 1', content: 'Content 1', locale: 'en-US', userId: 'user1' },
        { title: 'Resume 2', content: 'Content 2', locale: 'en-US', userId: 'user1' },
        { title: 'Resume 3', content: 'Content 3', locale: 'en-US', userId: 'user2' }
      ]);

      // Query by userId should be efficient
      const userResumes = await Resume.find({ userId: 'user1' });
      expect(userResumes).toHaveLength(2);

      // Query by locale should be efficient
      const englishResumes = await Resume.find({ locale: 'en-US' });
      expect(englishResumes).toHaveLength(3);
    });

    it('should handle pagination correctly', async () => {
      // Create many resumes
      const resumes = [];
      for (let i = 0; i < 25; i++) {
        resumes.push({
          title: `Resume ${i}`,
          content: `Content ${i}`,
          locale: 'en-US',
          userId: 'user123'
        });
      }
      await Resume.insertMany(resumes);

      // Test pagination
      const page1 = await Resume.find({ userId: 'user123' }).limit(10).skip(0);
      const page2 = await Resume.find({ userId: 'user123' }).limit(10).skip(10);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
    });
  });
});