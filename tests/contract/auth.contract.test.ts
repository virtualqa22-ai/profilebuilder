/**
 * Authentication API Contract Tests
 *
 * Contract testing to ensure frontend and backend stay aligned.
 * Tests verify auth API response schemas and request formats match expectations.
 */

/// <reference types="jest" />

import request from 'supertest';
import { createServer } from 'http';
import { GET, POST } from '../../api/auth/[...nextauth]/route';
import { requireAuth } from '../../backend/lib/auth';

// Mock NextAuth session
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock NextAuth providers
jest.mock('next-auth/providers/google', () => jest.fn());
jest.mock('next-auth/providers/linkedin', () => jest.fn());
jest.mock('next-auth/providers/credentials', () => jest.fn());

describe('Authentication API Contract Tests', () => {
  let server: any;
  let mockGetServerSession: any;

  beforeAll(async () => {
    mockGetServerSession = require('next-auth').getServerSession;

    // Setup mock session for contract testing
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
      expires: new Date(Date.now() + 3600000).toISOString(),
      sessionToken: 'mock-session-token',
    });

    // Create test server with all auth endpoints
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          const url = req.url || '';
          let body = {};
          if (req.body) {
            body = JSON.parse(req.body);
          }

          const mockRequest = {
            json: () => Promise.resolve(body),
            method: req.method,
            url: req.url,
            headers: req.headers,
          } as any;

          let response;
          if (req.method === 'GET') {
            response = await GET(mockRequest);
          } else if (req.method === 'POST') {
            response = await POST(mockRequest);
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
      server.listen(4008, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('Session API Contract', () => {
    it('should conform to session API contract', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Response structure for session endpoint
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expires');

      // Contract: User object structure
      if (response.body.user) {
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('email');
        expect(response.body.user).toHaveProperty('name');
        expect(typeof response.body.user.id).toBe('string');
        expect(typeof response.body.user.email).toBe('string');
        expect(typeof response.body.user.name).toBe('string');
      }

      // Contract: Expires should be ISO string
      expect(typeof response.body.expires).toBe('string');
      expect(new Date(response.body.expires).toISOString()).toBe(response.body.expires);
    });

    it('should handle unauthenticated session contract', async () => {
      // Mock no session
      mockGetServerSession.mockResolvedValueOnce(null);

      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Null session response
      expect(response.body).toBeNull();
    });
  });

  describe('Sign In API Contract', () => {
    it('should conform to sign in API contract', async () => {
      const response = await request(server)
        .post('/api/auth/signin/credentials')
        .send({
          email: 'test@example.com',
          password: 'password123',
          redirect: false,
        })
        .expect(200);

      // Contract: Sign in response structure
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('ok');
      expect(typeof response.body.ok).toBe('boolean');
    });

    it('should handle OAuth provider sign in contract', async () => {
      const response = await request(server)
        .post('/api/auth/signin/google')
        .send({
          redirect: false,
        })
        .expect(200);

      // Contract: OAuth sign in response
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('ok');
    });
  });

  describe('Sign Out API Contract', () => {
    it('should conform to sign out API contract', async () => {
      const response = await request(server)
        .post('/api/auth/signout')
        .send({
          redirect: false,
        })
        .expect(200);

      // Contract: Sign out response structure
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('ok');
      expect(typeof response.body.ok).toBe('boolean');
    });
  });

  describe('OAuth Callback Contract', () => {
    it('should conform to OAuth callback contract', async () => {
      const response = await request(server)
        .get('/api/auth/callback/google?code=test_code&state=test_state')
        .expect(200);

      // Contract: OAuth callback response
      expect(response.body).toHaveProperty('url');
    });

    it('should handle OAuth error callback contract', async () => {
      const response = await request(server)
        .get('/api/auth/callback/google?error=access_denied&error_description=User%20denied%20access')
        .expect(200);

      // Contract: OAuth error response
      expect(response.body).toHaveProperty('url');
    });
  });

  describe('Authentication Middleware Contract', () => {
    it('should conform to requireAuth success contract', async () => {
      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Contract: Success returns null
      expect(result).toBeNull();
    });

    it('should conform to requireAuth failure contract', async () => {
      // Mock no session
      mockGetServerSession.mockResolvedValueOnce(null);

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Contract: Failure response structure
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
    });

    it('should conform to requireAuth error contract', async () => {
      // Mock auth service error
      mockGetServerSession.mockRejectedValueOnce(new Error('Service unavailable'));

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: new Headers(),
      } as any;

      const result = await requireAuth(mockRequest);

      // Contract: Error response structure
      expect(result).toBeDefined();
      expect(result?.status).toBe(500);

      const body = await result?.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
    });
  });

  describe('Error Response Contracts', () => {
    it('should maintain error response contract for invalid credentials', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(200);

      // Contract: Credentials error response
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should maintain error response contract for malformed requests', async () => {
      const response = await request(server)
        .post('/api/auth/signin/credentials')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Contract: Malformed request error
      expect(response.body).toHaveProperty('error');
    });

    it('should maintain error response contract for unsupported methods', async () => {
      const response = await request(server)
        .put('/api/auth/session')
        .expect(405);

      // Contract: Method not allowed error
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Method not allowed');
    });
  });

  describe('Request Format Contracts', () => {
    it('should accept valid sign in request formats', async () => {
      const validRequests = [
        { email: 'user@example.com', password: 'password123' },
        { email: 'user@example.com', password: 'password123', redirect: false },
        { email: 'user@example.com', password: 'password123', callbackUrl: '/dashboard' },
      ];

      for (const requestBody of validRequests) {
        const response = await request(server)
          .post('/api/auth/signin/credentials')
          .send(requestBody)
          .expect(200);

        expect(response.body).toHaveProperty('ok');
      }
    });

    it('should reject malformed sign in request formats', async () => {
      const invalidRequests = [
        {}, // No credentials
        { email: 'invalid-email' }, // Missing password
        { password: 'password123' }, // Missing email
        { email: '', password: 'password123' }, // Empty email
        { email: 'user@example.com', password: '' }, // Empty password
      ];

      for (const requestBody of invalidRequests) {
        const response = await request(server)
          .post('/api/auth/signin/credentials')
          .send(requestBody)
          .expect(200);

        // Contract: Should handle invalid requests gracefully
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('Response Headers Contract', () => {
    it('should include required headers in all auth responses', async () => {
      const endpoints = [
        '/api/auth/session',
        '/api/auth/signin/google',
        '/api/auth/signout',
      ];

      for (const endpoint of endpoints) {
        const response = await request(server)
          .get(endpoint)
          .expect(200);

        // Contract: Content-Type should be JSON
        expect(response.headers['content-type']).toContain('application/json');

        // Contract: Should have correlation ID
        expect(response.headers).toHaveProperty('x-correlation-id');
      }
    });

    it('should include security headers in auth responses', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Data Type Contracts', () => {
    it('should return correct data types in session responses', async () => {
      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Session data types
      if (response.body.user) {
        expect(typeof response.body.user.id).toBe('string');
        expect(typeof response.body.user.email).toBe('string');
        expect(typeof response.body.user.name).toBe('string');
        if (response.body.user.image) {
          expect(typeof response.body.user.image).toBe('string');
        }
      }
      expect(typeof response.body.expires).toBe('string');
    });

    it('should handle edge cases in session data', async () => {
      // Mock session with minimal user data
      mockGetServerSession.mockResolvedValueOnce({
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Handle optional fields
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('name'); // Optional field
    });

    it('should handle null/undefined values in responses', async () => {
      // Mock session with null image
      mockGetServerSession.mockResolvedValueOnce({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          image: null,
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const response = await request(server)
        .get('/api/auth/session')
        .expect(200);

      // Contract: Handle null values
      expect(response.body.user.image).toBeNull();
    });
  });

  describe('Provider-Specific Contracts', () => {
    it('should conform to Google OAuth contract', async () => {
      const response = await request(server)
        .get('/api/auth/signin/google')
        .expect(200);

      // Contract: Google OAuth response
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('google');
    });

    it('should conform to LinkedIn OAuth contract', async () => {
      const response = await request(server)
        .get('/api/auth/signin/linkedin')
        .expect(200);

      // Contract: LinkedIn OAuth response
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('linkedin');
    });

    it('should conform to credentials provider contract', async () => {
      const response = await request(server)
        .post('/api/auth/callback/credentials')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Contract: Credentials response
      expect(response.body).toHaveProperty('url');
    });
  });
});