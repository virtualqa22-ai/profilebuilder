// Test for models and routes - simplified version
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock winston logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

let mongoServer;

describe('Models and Routes', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Resume Model', () => {
    const Resume = require('../src/models/Resume');

    test('should create and save resume', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
      });
      await resume.save();
      expect(resume.title).toBe('Test Resume');
    });

    test('should find resume by ID', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();
      const found = await Resume.findById(saved._id);
      expect(found.title).toBe('Test Resume');
    });

    test('should update resume', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Original',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();
      const updated = await Resume.findByIdAndUpdate(saved._id, { title: 'Updated' }, { new: true });
      expect(updated.title).toBe('Updated');
    });

    test('should delete resume', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();
      await Resume.findByIdAndDelete(saved._id);
      const found = await Resume.findById(saved._id);
      expect(found).toBeNull();
    });
  });

  describe('ResumeTemplate Model', () => {
    const ResumeTemplate = require('../src/models/ResumeTemplate');

    test('should create and save template', async () => {
      const template = new ResumeTemplate({
        name: 'Test Template',
        description: 'Description',
        structure: { sections: [] },
        locale: 'en-US',
      });
      await template.save();
      expect(template.name).toBe('Test Template');
    });

    test('should find template by ID', async () => {
      const template = new ResumeTemplate({
        name: 'Test Template',
        description: 'Description',
        structure: { sections: [] },
        locale: 'en-US',
      });
      const saved = await template.save();
      const found = await ResumeTemplate.findById(saved._id);
      expect(found.name).toBe('Test Template');
    });
  });

  describe('Resume Routes', () => {
    const request = require('supertest');
    const express = require('express');
    const resumeRoutes = require('../src/routes/resumes');

    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/resumes', resumeRoutes);
    });

    test('GET /resumes/:id should return resume', async () => {
      const Resume = require('../src/models/Resume');
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();

      const response = await request(app)
        .get(`/resumes/${saved._id}`)
        .expect(200);

      expect(response.body.title).toBe('Test Resume');
    });

    test('GET /resumes/user/:userId should return user resumes', async () => {
      const Resume = require('../src/models/Resume');
      const userId = new mongoose.Types.ObjectId();
      const resume = new Resume({
        userId,
        title: 'User Resume',
        content: 'Content',
        locale: 'en-US',
      });
      await resume.save();

      const response = await request(app)
        .get(`/resumes/user/${userId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('User Resume');
    });

    test('POST /resumes should create resume', async () => {
      const userId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/resumes')
        .send({
          userId: userId.toString(),
          title: 'New Resume',
          content: 'Content',
          locale: 'en-US',
        })
        .expect(201);

      expect(response.body.title).toBe('New Resume');
    });

    test('PUT /resumes/:id should update resume', async () => {
      const Resume = require('../src/models/Resume');
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Original',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();

      const response = await request(app)
        .put(`/resumes/${saved._id}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(response.body.title).toBe('Updated');
    });

    test('DELETE /resumes/:id should delete resume', async () => {
      const Resume = require('../src/models/Resume');
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Resume',
        content: 'Content',
        locale: 'en-US',
      });
      const saved = await resume.save();

      await request(app)
        .delete(`/resumes/${saved._id}`)
        .expect(200);

      const found = await Resume.findById(saved._id);
      expect(found).toBeNull();
    });
  });
});