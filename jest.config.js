const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './frontend',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/store/(.*)$': '<rootDir>/frontend/store/$1',
    '^@/backend/(.*)$': '<rootDir>/backend/$1',
    '^@/frontend/(.*)$': '<rootDir>/frontend/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^mongoose$': '<rootDir>/tests/__mocks__/mongoose.js',
    '^mongodb$': '<rootDir>/tests/__mocks__/mongodb.js',
    '^bson$': '<rootDir>/tests/__mocks__/bson.js',
    '^crypto-js$': '<rootDir>/tests/__mocks__/crypto-js.js',
  },
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
  collectCoverageFrom: [
    'frontend/**/*.{js,jsx,ts,tsx}',
    'backend/**/*.{js,ts}',
    'api/**/*.{js,ts}',
    '!frontend/**/*.d.ts',
    '!backend/**/*.d.ts',
    '!api/**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/*.test.{js,ts,jsx,tsx}',
    '!**/*.spec.{js,ts,jsx,tsx}',
    '!**/*.config.{js,ts}',
    '!**/jest.setup.js',
  ],
  coverageDirectory: 'coverage-unit',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
