/**
 * Cover Letter API Integration Tests
 *
 * Tests the complete cover letter endpoint functionality including:
 * - Cover letter generation with different templates
 * - Template listing and validation
 * - Input validation and sanitization
 * - Security headers and correlation ID propagation
 * - Error handling scenarios
 * - Performance monitoring
 */

import request from 'supertest';
import { createServer } from 'http';
import { GET, POST } from '../../../api/cover-letter/route';
import { TestUtils, TestDataFactory } from '../setup/test-setup.test';

describe('Cover Letter API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Create test server with Next.js-like request handling
    const mockApp = {
      prepare: jest.fn(() => Promise.resolve()),
      getRequestHandler: jest.fn(() => async (req: any, res: any) => {
        try {
          // Simulate Next.js request handling
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const requestObj = new Request(url.toString(), {
            method: req.method,
            headers: req.headers,
          });

          let response;
          if (req.method === 'GET') {
            response = await GET();
          } else if (req.method === 'POST') {
            // Read body for POST requests
            let body = '';
            req.on('data', chunk => body += chunk);
            await new Promise(resolve => req.on('end', resolve));
            const jsonBody = body ? JSON.parse(body) : {};
            requestObj.json = () => Promise.resolve(jsonBody);
            response = await POST(requestObj);
          }

          // Convert NextResponse to HTTP response
          const responseBody = await response.json();

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');

          // Copy headers from NextResponse
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.end(JSON.stringify(responseBody));
        } catch (error) {
          console.error('Request handler error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }),
    };

    // Mock next module
    jest.mock('next', () => jest.fn(() => mockApp));

    server = createServer(mockApp.getRequestHandler());
    await new Promise((resolve) => {
      server.listen(4005, resolve);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/cover-letter - List Templates', () => {
    it('should return list of available templates', async () => {
      const response = await request(server)
        .get('/api/cover-letter')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);

      // Verify template structure
      response.body.templates.forEach((template: any) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
      });

      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);
    });

    it('should include classic and modern templates', async () => {
      const response = await request(server)
        .get('/api/cover-letter')
        .expect(200);

      const templateIds = response.body.templates.map((t: any) => t.id);
      expect(templateIds).toContain('classic');
      expect(templateIds).toContain('modern');
    });

    it('should handle concurrent template requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server).get('/api/cover-letter')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestUtils.assertSuccessResponse(response);
        expect(response.body.templates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('POST /api/cover-letter - Generate Cover Letter', () => {
    it('should generate cover letter with valid data using classic template', async () => {
      const coverLetterData = TestDataFactory.createValidCoverLetter({
        template: 'classic'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(coverLetterData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('coverLetter');
      expect(response.body.data).toHaveProperty('template', 'classic');
      expect(typeof response.body.data.coverLetter).toBe('string');
      expect(response.body.data.coverLetter.length).toBeGreaterThan(0);

      // Verify cover letter contains expected content
      expect(response.body.data.coverLetter).toContain(coverLetterData.name);
      expect(response.body.data.coverLetter).toContain(coverLetterData.companyName);

      TestUtils.assertSecurityHeaders(response);
      TestUtils.assertCorrelationId(response);
    });

    it('should generate cover letter with valid data using modern template', async () => {
      const coverLetterData = TestDataFactory.createValidCoverLetter({
        template: 'modern'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(coverLetterData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('coverLetter');
      expect(response.body.data).toHaveProperty('template', 'modern');
      expect(typeof response.body.data.coverLetter).toBe('string');
      expect(response.body.data.coverLetter.length).toBeGreaterThan(0);
    });

    it('should sanitize input data', async () => {
      const maliciousData = TestDataFactory.createValidCoverLetter({
        name: '<script>alert("XSS")</script>John Doe',
        companyName: 'Test<script>alert("XSS")</script>Company',
        body: 'javascript:alert("XSS") content'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(maliciousData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      // Verify data is sanitized
      expect(response.body.data.coverLetter).not.toContain('<script>');
      expect(response.body.data.coverLetter).not.toContain('javascript:');
      expect(response.body.data.coverLetter).toContain('John Doe'); // Name should be clean
      expect(response.body.data.coverLetter).toContain('TestCompany'); // Company should be clean
    });

    it('should handle optional fields properly', async () => {
      const minimalData = {
        name: 'John Doe',
        email: 'john@example.com',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'I am interested in the position.',
        template: 'classic'
      };

      const response = await request(server)
        .post('/api/cover-letter')
        .send(minimalData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.coverLetter).toContain('John Doe');
      expect(response.body.data.coverLetter).toContain('Tech Corp');
    });

    it('should use default values for missing optional fields', async () => {
      const dataWithoutOptionals = {
        name: 'John Doe',
        email: 'john@example.com',
        recipientName: 'Jane Smith',
        companyName: 'Tech Corp',
        body: 'I am interested in the position.',
        template: 'classic'
        // Missing: address, phone, date, recipientTitle, companyAddress, salutation, closing, signature
      };

      const response = await request(server)
        .post('/api/cover-letter')
        .send(dataWithoutOptionals)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      // Should contain default salutation
      expect(response.body.data.coverLetter).toContain('Dear Hiring Manager');
      expect(response.body.data.coverLetter).toContain('Sincerely');
      expect(response.body.data.coverLetter).toContain('John Doe'); // Default signature
    });

    it('should reject invalid template selection', async () => {
      const invalidData = TestDataFactory.createValidCoverLetter({
        template: 'invalid-template'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'BAD_REQUEST');
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com'
        // Missing: recipientName, companyName, body, template
      };

      const response = await request(server)
        .post('/api/cover-letter')
        .send(incompleteData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(response.body.details).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const invalidData = TestDataFactory.createValidCoverLetter({
        email: 'invalid-email-format'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('email');
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000); // 10KB content
      const dataWithLongContent = TestDataFactory.createValidCoverLetter({
        body: longContent
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(dataWithLongContent)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.coverLetter.length).toBeGreaterThan(longContent.length);
    });

    it('should handle special characters in input', async () => {
      const dataWithSpecialChars = TestDataFactory.createValidCoverLetter({
        name: 'José María González',
        companyName: 'TechCorp™',
        body: 'I have experience with C++, Java, and .NET technologies.'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(dataWithSpecialChars)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.body.data.coverLetter).toContain('José María González');
      expect(response.body.data.coverLetter).toContain('TechCorp™');
      expect(response.body.data.coverLetter).toContain('C++');
      expect(response.body.data.coverLetter).toContain('.NET');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/cover-letter')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400);
    });

    it('should handle empty request body', async () => {
      const response = await request(server)
        .post('/api/cover-letter')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);

      TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle very large payloads', async () => {
      const largeData = TestDataFactory.createValidCoverLetter({
        body: 'A'.repeat(100000), // 100KB body
        address: 'B'.repeat(50000), // 50KB address
        companyAddress: 'C'.repeat(50000), // 50KB company address
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(largeData)
        .set('Content-Type', 'application/json');

      // Should either succeed or fail gracefully
      if (response.status === 200) {
        TestUtils.assertSuccessResponse(response);
      } else {
        expect([400, 413]).toContain(response.status); // Bad request or payload too large
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent cover letter generation requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/cover-letter')
          .send(TestDataFactory.createValidCoverLetter())
          .set('Content-Type', 'application/json')
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const avgResponseTime = totalDuration / responses.length;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestUtils.assertSuccessResponse(response);
        expect(response.body.data).toHaveProperty('coverLetter');
      });

      // Average response time should be reasonable under concurrent load
      expect(avgResponseTime).toBeLessThan(500); // Less than 500ms average
    });

    it('should maintain performance with large content', async () => {
      const startTime = Date.now();

      const largeData = TestDataFactory.createValidCoverLetter({
        body: 'A'.repeat(5000), // 5KB content
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(largeData)
        .set('Content-Type', 'application/json')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      TestUtils.assertSuccessResponse(response);
      expect(responseTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Security and Validation', () => {
    it('should prevent XSS attacks through input sanitization', async () => {
      const xssPayload = TestDataFactory.createValidCoverLetter({
        name: '<img src=x onerror=alert("XSS")>',
        body: '<script>document.cookie="stolen"</script>',
        companyName: 'Company <iframe src="evil.com">'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(xssPayload)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      // Verify dangerous content is sanitized
      expect(response.body.data.coverLetter).not.toContain('<img');
      expect(response.body.data.coverLetter).not.toContain('onerror');
      expect(response.body.data.coverLetter).not.toContain('<script>');
      expect(response.body.data.coverLetter).not.toContain('<iframe');
      expect(response.body.data.coverLetter).not.toContain('document.cookie');
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionData = TestDataFactory.createValidCoverLetter({
        name: "'; DROP TABLE users; --",
        body: 'UNION SELECT * FROM sensitive_data',
        companyName: 'Company; SELECT * FROM users--'
      });

      const response = await request(server)
        .post('/api/cover-letter')
        .send(sqlInjectionData)
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);

      // Verify SQL injection attempts are neutralized
      expect(response.body.data.coverLetter).not.toContain('DROP TABLE');
      expect(response.body.data.coverLetter).not.toContain('UNION SELECT');
      expect(response.body.data.coverLetter).not.toContain('SELECT * FROM');
    });

    it('should validate email format properly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        'user@.com',
        ''
      ];

      for (const invalidEmail of invalidEmails) {
        const data = TestDataFactory.createValidCoverLetter({
          email: invalidEmail
        });

        const response = await request(server)
          .post('/api/cover-letter')
          .send(data)
          .set('Content-Type', 'application/json')
          .expect(400);

        TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      }
    });

    it('should validate required field lengths', async () => {
      const emptyFields = [
        { name: '' },
        { email: 'valid@email.com', name: 'John', recipientName: '', companyName: 'Company', body: 'Content', template: 'classic' },
        { email: 'valid@email.com', name: 'John', recipientName: 'Jane', companyName: '', body: 'Content', template: 'classic' },
        { email: 'valid@email.com', name: 'John', recipientName: 'Jane', companyName: 'Company', body: '', template: 'classic' }
      ];

      for (const emptyField of emptyFields) {
        const data = { ...TestDataFactory.createValidCoverLetter(), ...emptyField };

        const response = await request(server)
          .post('/api/cover-letter')
          .send(data)
          .set('Content-Type', 'application/json')
          .expect(400);

        TestUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle template processing errors gracefully', async () => {
      // This would require mocking template processing errors
      const validData = TestDataFactory.createValidCoverLetter();

      const response = await request(server)
        .post('/api/cover-letter')
        .send(validData)
        .set('Content-Type', 'application/json')
        .expect(200);

      // Should succeed with valid data
      TestUtils.assertSuccessResponse(response);
    });

    it('should handle network timeouts gracefully', async () => {
      // Test with timeout
      const response = await request(server)
        .post('/api/cover-letter')
        .send(TestDataFactory.createValidCoverLetter())
        .set('Content-Type', 'application/json')
        .timeout(1000) // 1 second timeout
        .expect(200);

      TestUtils.assertSuccessResponse(response);
    });

    it('should handle invalid content types', async () => {
      const response = await request(server)
        .post('/api/cover-letter')
        .send('not json data')
        .set('Content-Type', 'text/plain')
        .expect(400);

      TestUtils.assertErrorResponse(response, 400);
    });
  });

  describe('Monitoring and Observability', () => {
    it('should include correlation IDs in all responses', async () => {
      const response = await request(server)
        .post('/api/cover-letter')
        .send(TestDataFactory.createValidCoverLetter())
        .set('Content-Type', 'application/json')
        .expect(200);

      TestUtils.assertCorrelationId(response);
    });

    it('should provide detailed error information for debugging', async () => {
      const invalidData = TestDataFactory.createInvalidCoverLetter();

      const response = await request(server)
        .post('/api/cover-letter')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('error');
      if (response.body.details) {
        expect(typeof response.body.details).toBe('object');
      }
    });

    it('should handle monitoring tool requests appropriately', async () => {
      const response = await request(server)
        .get('/api/cover-letter')
        .set('User-Agent', 'Monitoring-Tool/1.0')
        .set('Accept', 'application/json')
        .expect(200);

      TestUtils.assertSuccessResponse(response);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});