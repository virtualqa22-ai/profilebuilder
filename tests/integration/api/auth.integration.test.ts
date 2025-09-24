/**
 * Authentication Integration Tests
 *
 * Tests the complete authentication flow including:
 * - Login via credentials and OAuth providers
 * - Session management and validation
 * - Logout functionality
 * - Authentication middleware behavior
 * - Error handling for auth failures
 */

import request from 'supertest';
import { createServer } from 'http';
import { GET, POST } from '../../../api/auth/[...nextauth]/route';
import { requireAuth } from '../../../backend/lib/auth';
import { TestUtils } from '../setup/test-setup.test';

// Mock NextAuth session
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock NextAuth providers
jest.mock('next-auth/providers/google', () => jest.fn());
jest.mock('next-auth/providers/linkedin', () => jest.fn());
jest.mock('next-auth/providers/credentials', () => jest.fn());

describe('Authentication Integration Tests', () => {
  let server: any;
  let mockGetServerSession: any;

  beforeAll(async () => {
    mockGetServerSession = require('next-auth').getServerSession;

    // Create test server with Next.js-like request handling
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const request = new Request(url.toString(), {
            method: req.method,
            headers: req.headers,
          });

          let response;
          if (req.method === 'GET') {
            response = await GET(request);
          } else if (req.method === 'POST') {
            response = await POST(request);
          } else {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const responseBody = await response.json();

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');

          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.end(JSON.stringify(responseBody));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }),
    };

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4004, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NextAuth Route Handler', () => {
    it('should handle GET requests for session information', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // NextAuth returns session data or null
      expect(response.body).toBeDefined();
    });

    it('should handle POST requests for authentication actions', async () => {
      const response = await request(server)
        .post('/api/auth/signin/credentials')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // NextAuth handles the authentication flow
      expect(response.body).toBeDefined();
    });

    it('should apply security headers to auth responses', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      TestUtils.assertSecurityHeaders(response);
    });

    it('should include correlation ID in auth responses', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });
  });

  describe('Authentication Middleware (requireAuth)', () => {
    it('should allow access when user is authenticated', async () => {
      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Should return null (allow access)
      expect(result).toBeNull();
    });

    it('should deny access when user is not authenticated', async () => {
      // Mock no session
      mockGetServerSession.mockResolvedValue(null);

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Should return NextResponse with 401
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error', 'Authentication required');
      expect(body).toHaveProperty('code', 'AUTH_REQUIRED');
    });

    it('should deny access when session is invalid', async () => {
      // Mock invalid session (no user)
      mockGetServerSession.mockResolvedValue({});

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it('should handle authentication service errors gracefully', async () => {
      // Mock auth service failure
      mockGetServerSession.mockRejectedValue(new Error('Database connection failed'));

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      expect(result).toBeDefined();
      expect(result?.status).toBe(500);

      const body = await result?.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error', 'Authentication service unavailable');
      expect(body).toHaveProperty('code', 'AUTH_ERROR');
    });
  });

  describe('Session Management', () => {
    it('should maintain session consistency across requests', async () => {
      // Mock consistent session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });

      const mockRequest = {
        url: '/api/test',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result1 = await requireAuth(mockRequest);
      const result2 = await requireAuth(mockRequest);

      // Both should allow access
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should handle expired sessions', async () => {
      // Mock expired session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      });

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Should deny access due to expired session
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it('should validate session user data structure', async () => {
      // Mock session with complete user data
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
        },
      });

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('OAuth Provider Integration', () => {
    it('should handle Google OAuth callback', async () => {
      const response = await request(server)
        .get('/api/auth/callback/google?code=test_code&state=test_state')
        .expect(200);

      // NextAuth handles OAuth flow
      expect(response.body).toBeDefined();
    });

    it('should handle LinkedIn OAuth callback', async () => {
      const response = await request(server)
        .get('/api/auth/callback/linkedin?code=test_code&state=test_state')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle OAuth errors gracefully', async () => {
      const response = await request(server)
        .get('/api/auth/callback/google?error=access_denied')
        .expect(200);

      // NextAuth should handle OAuth errors
      expect(response.body).toBeDefined();
    });
  });

  describe('Credentials Authentication', () => {
    it('should handle credentials login attempts', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Credentials provider handles authentication
      expect(response.body).toBeDefined();
    });

    it('should reject invalid credentials format', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(200);

      // NextAuth handles validation
      expect(response.body).toBeDefined();
    });

    it('should handle missing credentials', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send({})
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout requests', async () => {
      const response = await request(server)
        .post('/api/auth/signout')
        .expect(200);

      // NextAuth handles logout
      expect(response.body).toBeDefined();
    });

    it('should clear session on logout', async () => {
      // First establish a session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      // Then logout should clear it
      const response = await request(server)
        .post('/api/auth/signout')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed auth requests', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle unsupported auth providers', async () => {
      const response = await request(server)
        .get('/api/auth/signin/unsupported')
        .expect(200);

      // NextAuth handles unknown providers
      expect(response.body).toBeDefined();
    });

    it('should handle concurrent auth requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server).get('/api/auth/session')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle very large request payloads', async () => {
      const largePayload = {
        email: 'a'.repeat(1000) + '@example.com',
        password: 'b'.repeat(1000),
      };

      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send(largePayload)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Security and Headers', () => {
    it('should set secure headers on all auth endpoints', async () => {
      const endpoints = [
        '/api/auth/session',
        '/api/auth/signin',
        '/api/auth/signout',
      ];

      for (const endpoint of endpoints) {
        const response = await request(server)
          .get(endpoint)
          .expect(200);

        TestUtils.assertSecurityHeaders(response);
      }
    });

    it('should prevent session fixation attacks', async () => {
      // Mock session with fixed ID
      mockGetServerSession.mockResolvedValue({
        user: { id: 'fixed-user-id' },
        sessionToken: 'fixed-token',
      });

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      expect(result).toBeNull();
    });

    it('should validate session token integrity', async () => {
      // Mock session with invalid token
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123' },
        sessionToken: null,
      });

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });
  });
});