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
};

module.exports = createJestConfig(customJestConfig);
