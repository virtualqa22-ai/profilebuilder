// Jest setup file for AI Processing Service tests
// Configures test environment and global mocks

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AI_API_URL = 'http://localhost:3000/api/ai/process';
process.env.AI_API_KEY = 'test-api-key';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external dependencies
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('opossum', () => {
  return jest.fn().mockImplementation(() => ({
    fire: jest.fn(),
    canExecute: jest.fn(() => true),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    opened: false,
    stats: {
      failures: 0,
      successes: 0,
      timeouts: 0,
    },
  }));
});

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock request/response objects
  createMockReq: (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    ip: '127.0.0.1',
    get: jest.fn((header) => {
      const headers = {
        'user-agent': 'test-agent',
        'x-correlation-id': 'test-correlation-id',
      };
      return headers[header.toLowerCase()];
    }),
    correlationId: 'test-correlation-id',
  }),

  createMockRes: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    return res;
  },

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};