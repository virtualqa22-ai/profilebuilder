// Jest setup file for Document Generation Service tests
// Configures test environment and global mocks

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock fs
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('.json')) {
        return Promise.resolve(JSON.stringify({
          name: 'modern',
          content: 'Name: {{name}}, Email: {{email}}',
          sections: []
        }));
      }
      return Promise.resolve('template content');
    }),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
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
    add: jest.fn(),
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

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }),
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