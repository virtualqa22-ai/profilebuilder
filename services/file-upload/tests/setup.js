// Jest setup file for File Upload Service tests
// Configures test environment and global mocks

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET = 'test-bucket';

// Mock external dependencies
jest.mock('multer', () => ({
  memoryStorage: jest.fn(() => ({ storage: 'memory' })),
  diskStorage: jest.fn(() => ({ storage: 'disk' })),
  single: jest.fn(() => (req, res, next) => next()),
  array: jest.fn(() => (req, res, next) => next()),
  fields: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn(() => ({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://s3.amazonaws.com/bucket/file.pdf',
        Key: 'file.pdf',
        Bucket: 'bucket',
      }),
    })),
    deleteObject: jest.fn(() => ({
      promise: jest.fn().mockResolvedValue({}),
    })),
    getSignedUrl: jest.fn(() => 'https://signed-url.com'),
  })),
}));

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
  },
}));

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

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-checksum'),
  })),
  randomBytes: jest.fn(() => Buffer.from('mock-random')),
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock request/response objects
  createMockReq: (body = {}, params = {}, query = {}, file = null) => ({
    body,
    params,
    query,
    file,
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

  // Helper to create mock file object
  createMockFile: (overrides = {}) => ({
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test file content'),
    size: 1024,
    encoding: '7bit',
    ...overrides,
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};