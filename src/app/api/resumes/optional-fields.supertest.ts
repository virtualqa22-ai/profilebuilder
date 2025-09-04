/**
 * Integration test for /api/resumes (POST) with optional fields using supertest and next/server
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { createServer } from 'http';
import next from 'next';

const app = next({ dev: true, dir: process.cwd() });
const handle = app.getRequestHandler();

// Helper to start Next.js server for testing
let server: any;
beforeAll(async () => {
  await app.prepare();
  server = createServer((req, res) => handle(req, res)).listen(4001);
});
afterAll(async () => {
  await mongoose.connection.close();
  server.close();
});

describe('/api/resumes POST - Optional Fields Integration', () => {
  it('should create a resume successfully when optional fields are not provided and not required', async () => {
    const res = await request(server)
      .post('/api/resumes')
      .send({
        title: 'Test Resume',
        content: 'Test Content',
        locale: 'en-US',
        personalInfo: { name: 'Test User' },
      })
      .set('Accept', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Test Resume');
  });

  it('should create a resume successfully when optional fields are provided', async () => {
    const res = await request(server)
      .post('/api/resumes')
      .send({
        title: 'Test Resume',
        content: 'Test Content',
        locale: 'en-US',
        photos: 'photo_url',
        certifications: 'cert_details',
        hobbies: 'hobby_details',
        references: 'ref_details',
        personalInfo: { name: 'Test User' },
      })
      .set('Accept', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.photos).toBe('photo_url');
  });

  it('should return 400 if required optional fields are missing for a specific locale', async () => {
    const res = await request(server)
      .post('/api/resumes')
      .send({
        title: 'Test Resume',
        content: 'Test Content',
        locale: 'test-required',
        personalInfo: { name: 'Test User' },
      })
      .set('Accept', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toMatchObject({
      photos: expect.any(String),
      certifications: expect.any(String),
      hobbies: expect.any(String),
      references: expect.any(String),
    });
  });

  it('should create a resume successfully when all required optional fields are provided for a specific locale', async () => {
    const res = await request(server)
      .post('/api/resumes')
      .send({
        title: 'Test Resume',
        content: 'Test Content',
        locale: 'test-required',
        photos: 'photo_url',
        certifications: 'cert_details',
        hobbies: 'hobby_details',
        references: 'ref_details',
        personalInfo: { name: 'Test User' },
      })
      .set('Accept', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.photos).toBe('photo_url');
  });
});
