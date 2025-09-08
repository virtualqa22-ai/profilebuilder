import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for Node.js
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = TextDecoder;
}

// Polyfill Request and Response for Next.js API route testing
// These are simple mock classes to satisfy the global requirements for some tests.
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {};
}
if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {};
}

// Mock performance for tests that might rely on it (e.g., Next.js internal calls)
if (typeof global.performance === 'undefined') {
  global.performance = {
    getEntriesByName: jest.fn(() => []),
    now: jest.fn(() => 0),
  };
}

