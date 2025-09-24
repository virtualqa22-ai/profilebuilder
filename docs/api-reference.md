# CareerVerve Microservices API Reference

## Overview

The CareerVerve platform is built on a microservices architecture with five core services: User Management, Resume Management, AI Processing, Document Generation, and File Upload. This document provides comprehensive API documentation for all microservices, including OpenAPI 3.0 specifications, request/response schemas, authentication requirements, error codes, and examples.

**Architecture Overview:**
- **User Management Service**: Handles user accounts, authentication, audit logs, and GDPR compliance
- **Resume Management Service**: Manages resume CRUD operations and user-specific data isolation
- **AI Processing Service**: Provides AI-powered content processing with actor system integration
- **Document Generation Service**: Handles DOCX document creation and ATS-safe formatting
- **File Upload Service**: Manages secure file uploads with virus scanning and validation

**Base URLs:**
- User Management: `http://user-management-service:3001/api/v1`
- Resume Management: `http://resume-management-service:3002/api/v1`
- AI Processing: `http://ai-processing-service:3003/api/v1`
- Document Generation: `http://document-generation-service:3004/api/v1`
- File Upload: `http://file-upload-service:3005/api/v1`

**Version:** 1.0.0

**Authentication:** JWT tokens with service-to-service authentication via API keys

## Table of Contents

- [Authentication](#authentication)
- [User Management Service](#user-management-service)
- [Resume Management Service](#resume-management-service)
- [AI Processing Service](#ai-processing-service)
- [Document Generation Service](#document-generation-service)
- [File Upload Service](#file-upload-service)
- [Inter-Service Communication](#inter-service-communication)
- [Actor System Integration](#actor-system-integration)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Security](#security)
- [Compliance](#compliance)

## Authentication

### JWT Token Authentication

All microservices use JWT tokens for authentication. Tokens are issued by the User Management Service and validated by each service.

**Header:** `Authorization: Bearer <jwt_token>`

### Service-to-Service Authentication

Internal service communication uses API keys stored in environment variables.

**Header:** `X-API-Key: <service_api_key>`

### Token Validation

```javascript
// Example token validation middleware
const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

## User Management Service

**Port:** 3001
**Database:** MongoDB (user_management_db)

### Endpoints

#### GET /api/v1/users/{id}

Retrieve user information by ID.

**Authentication:** Required (JWT)

**Parameters:**
- `id` (path): User ID (MongoDB ObjectId)

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "name": "John Doe",
  "privacyMode": false,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found

#### POST /api/v1/users

Create a new user account.

**Authentication:** Not required (public registration)

**Request Body:**
```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "privacyMode": false
}
```

**Response (201):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "name": "John Doe",
  "privacyMode": false,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `409 Conflict`: Email already exists
- `422 Unprocessable Entity`: Validation failed

#### PUT /api/v1/users/{id}

Update user information.

**Authentication:** Required (JWT, user owns resource or admin)

**Request Body:**
```json
{
  "name": "John Smith",
  "privacyMode": true
}
```

**Response (200):** Same as GET response

#### DELETE /api/v1/users/{id}

Delete user account (GDPR compliance).

**Authentication:** Required (JWT, user owns resource or admin)

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

#### GET /api/v1/health

Service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "user-management",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

### Data Models

#### User Schema
```javascript
{
  email: {
    type: String,
    required: true,
    unique: true,
    validate: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxlength: 254
  },
  name: {
    type: String,
    maxlength: 100
  },
  privacyMode: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## Resume Management Service

**Port:** 3002
**Database:** MongoDB (resume_management_db)

### Endpoints

#### GET /api/v1/resumes/{id}

Retrieve a specific resume.

**Authentication:** Required (JWT, user owns resource)

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "title": "Software Engineer Resume",
  "content": "encrypted_content_here",
  "locale": "en-US",
  "version": 1,
  "photos": "encrypted_photos",
  "certifications": "encrypted_certs",
  "hobbies": "encrypted_hobbies",
  "references": "encrypted_refs",
  "comments": [
    {
      "field": "workExperience",
      "text": "Consider adding metrics",
      "author": "AI Assistant",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

#### GET /api/v1/resumes/user/{userId}

Retrieve all resumes for a user.

**Authentication:** Required (JWT, user owns resource)

**Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Software Engineer Resume",
    "locale": "en-US",
    "version": 1,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

#### POST /api/v1/resumes

Create a new resume.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "userId": "user123",
  "title": "Software Engineer Resume",
  "content": "Resume content here...",
  "locale": "en-US",
  "photos": "base64_encoded_photos",
  "certifications": "Certification details...",
  "hobbies": "Hobby information...",
  "references": "Reference contacts..."
}
```

#### PUT /api/v1/resumes/{id}

Update an existing resume.

**Authentication:** Required (JWT, user owns resource)

#### DELETE /api/v1/resumes/{id}

Delete a resume.

**Authentication:** Required (JWT, user owns resource)

#### POST /api/v1/resumes/{id}/comments

Add a comment to a resume field.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "field": "workExperience",
  "text": "Consider adding quantifiable achievements",
  "author": "AI Assistant"
}
```

## AI Processing Service

**Port:** 3003
**Architecture:** Actor-based system with Akka.NET/C# implementation

### Endpoints

#### POST /api/v1/ai/rewrite

Rewrite content using AI with style specifications.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "Content to rewrite...",
  "style": "professional",
  "userId": "user123",
  "correlationId": "req-12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": "Rewritten professional content...",
  "processingTime": 1.5,
  "model": "gpt-4",
  "correlationId": "req-12345"
}
```

#### POST /api/v1/ai/suggestions

Provide grammar and style suggestions.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "Content to analyze...",
  "userId": "user123",
  "correlationId": "req-12346"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "grammar": ["Suggestion 1", "Suggestion 2"],
    "style": ["Suggestion 3"],
    "suggestions": ["General advice"]
  },
  "correlationId": "req-12346"
}
```

#### POST /api/v1/ai/lint

Comprehensive content linting with severity scoring.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "Content to lint...",
  "language": "text",
  "userId": "user123",
  "correlationId": "req-12347"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "type": "grammar",
        "message": "Missing comma",
        "line": 1,
        "column": 15,
        "severity": "warning"
      }
    ],
    "score": 85
  },
  "correlationId": "req-12347"
}
```

### Actor System Integration

The AI Processing Service uses an actor-based architecture for scalability and fault tolerance:

- **Supervisor Actor**: Manages worker actors and handles failures
- **Worker Actors**: Process individual AI requests
- **Router Actor**: Distributes requests across worker pools
- **Metrics Actor**: Collects performance metrics

**Circuit Breaker Pattern:** Automatic failure isolation prevents cascade failures.

## Document Generation Service

**Port:** 3004
**Technology:** Node.js with docx library

### Endpoints

#### POST /api/v1/documents/generate

Generate a DOCX document from resume data.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "resumeData": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "summary": "Professional summary...",
    "workExperience": [...],
    "education": [...],
    "skills": [...]
  },
  "template": "ats-safe",
  "userId": "user123"
}
```

**Response (200):** Binary DOCX file
**Content-Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
**Content-Disposition:** `attachment; filename="resume.docx"`

#### POST /api/v1/documents/import

Import and parse DOCX resume file.

**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: DOCX file (max 10MB)
- `userId`: User identifier

**Response (200):**
```json
{
  "success": true,
  "data": {
    "personalInfo": {...},
    "workExperience": [...],
    "tables": [...],
    "bullets": [...]
  }
}
```

## File Upload Service

**Port:** 3005
**Technology:** Node.js with multer and clamav

### Endpoints

#### POST /api/v1/upload

Upload a file with security scanning.

**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload (JPEG, PNG, GIF, PDF, DOCX - max 10MB)
- `userId`: User identifier
- `type`: File type category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file-12345",
    "filename": "resume.pdf",
    "url": "/uploads/1705312200000-resume.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### GET /api/v1/upload/{id}

Retrieve uploaded file information.

**Authentication:** Required (JWT, user owns file)

#### DELETE /api/v1/upload/{id}

Delete uploaded file.

**Authentication:** Required (JWT, user owns file)

## Inter-Service Communication

### Synchronous Communication

Services communicate synchronously using HTTP with circuit breakers:

```javascript
// Example service-to-service call with circuit breaker
const response = await circuitBreaker.call(async () => {
  return axios.get('http://resume-management-service:3002/api/v1/resumes/user/' + userId, {
    headers: {
      'Authorization': 'Bearer ' + serviceToken,
      'X-API-Key': process.env.RESUME_SERVICE_KEY
    }
  });
});
```

### Asynchronous Communication

Event-driven communication using message queues (RabbitMQ):

**Events:**
- `user.created`
- `user.deleted`
- `resume.updated`
- `document.generated`

### Service Discovery

Kubernetes service discovery with DNS:
- `user-management-service.default.svc.cluster.local`
- `resume-management-service.default.svc.cluster.local`

## Actor System Integration

The AI Processing Service implements an actor-based architecture:

### Actor Hierarchy

```
SupervisorActor
├── RouterActor
│   ├── WorkerActorPool (10 actors)
│   ├── MetricsActor
│   └── HealthActor
└── CircuitBreakerActor
```

### Message Patterns

**Request-Response:**
```csharp
// Worker actor processes AI requests
public async Task ReceiveAsync(object message)
{
    switch (message)
    {
        case RewriteRequest req:
            var result = await _aiService.RewriteAsync(req.Content, req.Style);
            Sender.Tell(new RewriteResponse(result));
            break;
    }
}
```

**Fire-and-Forget:**
```csharp
// Metrics collection
Context.System.EventStream.Subscribe(Self, typeof(MetricMessage));
```

### Fault Tolerance

- **Supervisor Strategy:** Restart failed actors
- **Circuit Breaker:** Prevent cascade failures
- **Backoff Supervision:** Exponential backoff for retries

## Error Codes

All services use standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "service-name"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `UNPROCESSABLE_ENTITY` | 422 | Business logic error |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

### Per-Service Limits

| Service | Endpoint | Limit | Window |
|---------|----------|-------|--------|
| User Management | All | 1000 req/min | 1 minute |
| Resume Management | All | 2000 req/min | 1 minute |
| AI Processing | AI endpoints | 100 req/min/user | 1 minute |
| Document Generation | Generate | 50 req/hour/user | 1 hour |
| File Upload | Upload | 20 req/hour/user | 1 hour |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
X-RateLimit-Retry-After: 60
```

## Security

### Authentication & Authorization

- **JWT Tokens:** Issued by User Management Service with 1-hour expiration
- **API Keys:** Service-to-service authentication using environment variables
- **Role-Based Access:** User, Admin, Service roles

### Data Protection

- **Encryption at Rest:** AES-256 encryption for sensitive fields
- **Encryption in Transit:** TLS 1.3 for all communications
- **Field-Level Encryption:** MongoDB field encryption for PII

### Input Validation

- **Schema Validation:** Joi/Yup validation schemas
- **Sanitization:** Input sanitization to prevent XSS
- **File Scanning:** ClamAV virus scanning for uploads

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000
Content-Security-Policy: default-src 'self'
```

## Compliance

### GDPR Compliance

- **Data Minimization:** Only collect necessary user data
- **Right to Erasure:** Complete data deletion endpoints
- **Audit Logging:** Immutable audit logs for all user actions
- **Consent Management:** Explicit user consent tracking

### Data Privacy

- **Anonymization:** User data anonymized for analytics
- **Retention Policies:** Automatic data cleanup after retention periods
- **Data Portability:** User data export functionality

### Ethical AI Usage

- **Bias Mitigation:** Regular AI model audits
- **Transparency:** Clear disclosure of AI processing
- **User Consent:** Opt-in for AI features
- **Fairness:** AI processing does not discriminate

## OpenAPI Specifications

Complete OpenAPI 3.0 specifications are available in individual service repositories:

- [User Management OpenAPI Spec](./services/user-management/openapi.yaml)
- [Resume Management OpenAPI Spec](./services/resume-management/openapi.yaml)
- [AI Processing OpenAPI Spec](./services/ai-processing/openapi.yaml)
- [Document Generation OpenAPI Spec](./services/document-generation/openapi.yaml)
- [File Upload OpenAPI Spec](./services/file-upload/openapi.yaml)

## SDKs and Examples

### JavaScript Client

```javascript
class CareerVerveAPI {
  constructor(baseURLs) {
    this.baseURLs = baseURLs;
  }

  async createUser(userData) {
    return this.callService('user-management', 'POST', '/api/v1/users', userData);
  }

  async getUserResumes(userId) {
    return this.callService('resume-management', 'GET', `/api/v1/resumes/user/${userId}`);
  }

  async rewriteContent(content, style) {
    return this.callService('ai-processing', 'POST', '/api/v1/ai/rewrite', {
      content, style
    });
  }
}
```

## Monitoring and Observability

### Health Checks

All services expose health endpoints at `/health`:

```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "dependencies": "healthy"
  }
}
```

### Metrics

Prometheus-compatible metrics at `/metrics`:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="user-management",method="GET",status="200"} 1500
```

### Logging

Structured logging with correlation IDs:

```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "level": "info",
  "service": "user-management",
  "correlationId": "req-12345",
  "message": "User created",
  "userId": "user123"
}
```

## Versioning

API versioning follows semantic versioning:

- **Major Version:** Breaking changes (URL path: `/api/v2/`)
- **Minor Version:** New features, backward compatible
- **Patch Version:** Bug fixes, no API changes

### Backward Compatibility

- Deprecated endpoints marked with `Deprecation` header
- Graceful deprecation with 12-month migration period
- Version headers for client compatibility

## Support

For API support and questions:

- **Documentation:** https://docs.careerverve.com
- **API Status:** https://status.careerverve.com
- **Developer Portal:** https://developers.careerverve.com
- **Support Email:** api-support@careerverve.com

---

*This documentation is automatically generated and updated with each deployment. Last updated: 2024-01-15*