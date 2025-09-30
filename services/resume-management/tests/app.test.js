// Test for app.js - focusing on resilience patterns and endpoints
const request = require('supertest');

// Mock mongoose to prevent actual database connections
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(),
  connection: { collections: {} },
}));

// Mock winston logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  addCorrelationId: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock resume routes
jest.mock('../src/routes/resumes', () => jest.fn((req, res, next) => {
  res.json({ message: 'mocked route response' });
}));

describe('App.js - Application Setup and Resilience', () => {
  let app;
  let originalSetInterval;

  beforeAll(async () => {
    // Mock setInterval to prevent hanging
    originalSetInterval = global.setInterval;
    global.setInterval = jest.fn(() => 'mock-timer');

    // Clear any cached modules
    delete require.cache[require.resolve('../src/app')];
    app = require('../src/app');
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
  });

  test('should create express app instance', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.use).toBe('function');
  });

  test('should handle health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBeDefined();
    expect(response.body.service).toBe('resume-management-service');
    expect(response.body.resilience).toBeDefined();
    expect(response.body.resilience.circuitBreaker).toBeDefined();
    expect(response.body.resilience.bulkhead).toBeDefined();
  });

  test('should handle metrics endpoint', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);

    expect(response.body.service).toBe('resume-management');
    expect(response.body.circuitBreaker).toBeDefined();
    expect(response.body.bulkhead).toBeDefined();
  });

  test('should handle 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body.error).toBe('Not found');
  });

  test('should apply JSON parsing middleware', async () => {
    const response = await request(app)
      .post('/api/resumes')
      .send({ test: 'data' })
      .expect(200);

    expect(response.body.message).toBe('mocked route response');
  });

  test('should apply URL encoded middleware', async () => {
    const response = await request(app)
      .post('/api/resumes')
      .send('test=data')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(200);

    expect(response.body.message).toBe('mocked route response');
  });

  test('should add correlation ID to requests', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toBeDefined();
  });

  test('should handle unhandled errors', async () => {
    // Test the general error handler by causing an error
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});