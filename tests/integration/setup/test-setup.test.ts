/**
 * Integration Test Setup and Utilities
 *
 * Provides database setup, cleanup, and test utilities for integration tests.
 * Uses mongodb-memory-server for isolated database testing.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { getCacheManager } from '../../../backend/lib/cacheManager';

// Test database instance
let mongoServer: MongoMemoryServer;

/**
 * Setup test database before all tests
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set environment variable for tests
    process.env.MONGODB_URI = mongoUri;

    // Connect to test database
    await mongoose.connect(mongoUri);

    console.log('Test database connected:', mongoUri);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleanup test database after all tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Close mongoose connection
    await mongoose.connection.close();

    // Stop MongoDB memory server
    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('Test database cleaned up');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * Clear all collections in test database
 */
export async function clearDatabase(): Promise<void> {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    console.log('Database cleared');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
}

/**
 * Setup test cache (disable Redis for tests)
 */
export async function setupTestCache(): Promise<void> {
  // Disable Redis for tests to avoid external dependencies
  process.env.CACHE_REDIS_ENABLED = 'false';

  // Clear any existing cache
  const cacheManager = getCacheManager();
  await cacheManager.clear();

  console.log('Test cache setup complete');
}

/**
 * Create test server for API testing
 */
export function createTestServer(handler: (req: any, res: any) => void): any {
  return createServer(handler);
}

/**
 * Test data factories
 */
export const TestDataFactory = {
  /**
   * Create valid resume data
   */
  createValidResume(overrides: Partial<any> = {}): any {
    return {
      title: 'Test Resume',
      content: 'This is test resume content',
      locale: 'en-US',
      version: 1,
      ...overrides
    };
  },

  /**
   * Create valid cover letter data
   */
  createValidCoverLetter(overrides: Partial<any> = {}): any {
    return {
      name: 'John Doe',
      email: 'john.doe@example.com',
      recipientName: 'Jane Smith',
      companyName: 'Tech Corp',
      body: 'I am writing to express my interest in the position.',
      template: 'classic',
      ...overrides
    };
  },

  /**
   * Create invalid resume data for validation testing
   */
  createInvalidResume(): any {
    return {
      title: '', // Empty title
      content: '', // Empty content
      locale: 'invalid-locale'
    };
  },

  /**
   * Create invalid cover letter data for validation testing
   */
  createInvalidCoverLetter(): any {
    return {
      name: '',
      email: 'invalid-email',
      recipientName: '',
      companyName: '',
      body: '',
      template: 'invalid-template'
    };
  }
};

/**
 * Test utilities for common assertions
 */
export const TestUtils = {
  /**
   * Assert response has security headers
   */
  assertSecurityHeaders(response: any): void {
    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
    expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
  },

  /**
   * Assert response has correlation ID
   */
  assertCorrelationId(response: any): void {
    expect(response.headers).toHaveProperty('x-correlation-id');
    expect(typeof response.headers['x-correlation-id']).toBe('string');
  },

  /**
   * Assert successful API response structure
   */
  assertSuccessResponse(response: any, expectedData?: any): void {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    if (expectedData) {
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject(expectedData);
    }
  },

  /**
   * Assert error response structure
   */
  assertErrorResponse(response: any, expectedStatus: number = 400, expectedCode?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');

    if (expectedCode) {
      expect(response.body).toHaveProperty('code', expectedCode);
    }
  },

  /**
   * Assert pagination structure
   */
  assertPaginationStructure(response: any, expectedPage: number = 1): void {
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('page', expectedPage);
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('pages');
    expect(response.body.pagination).toHaveProperty('hasNext');
    expect(response.body.pagination).toHaveProperty('hasPrev');
  }
};

// Global test setup
beforeAll(async () => {
  await setupTestDatabase();
  await setupTestCache();
}, 60000); // 60 second timeout for database setup

// Global test cleanup
afterAll(async () => {
  await cleanupTestDatabase();
}, 60000);

// Clear database between tests
afterEach(async () => {
  await clearDatabase();
});

// Export for use in other test files
export default {
  setupTestDatabase,
  cleanupTestDatabase,
  clearDatabase,
  setupTestCache,
  createTestServer,
  TestDataFactory,
  TestUtils
};