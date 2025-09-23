# CareerVerve API Reference

## Overview

The CareerVerve API provides comprehensive endpoints for resume and cover letter management, user authentication, file uploads, and system monitoring. This API follows RESTful principles and includes robust security, validation, and error handling.

**Base URL:** `https://your-domain.com/api`

**Version:** 1.0.0

**Authentication:** NextAuth.js with OAuth providers (Google, LinkedIn) and credentials

## Table of Contents

- [Authentication](#authentication)
- [Health Check](#health-check)
- [Resumes](#resumes)
- [Cover Letters](#cover-letters)
- [User Management](#user-management)
- [File Upload](#file-upload)
- [DOCX Import and Generation](#docx-import-and-generation)
- [Locales](#locales)
- [Metrics](#metrics)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Security](#security)

## Authentication

The API uses NextAuth.js for authentication with multiple providers.

### Supported Providers

- **Google OAuth**
- **LinkedIn OAuth**
- **Credentials** (email/password)

### Authentication Endpoints

#### GET/POST /api/auth/[...nextauth]

NextAuth.js handler for all authentication operations.

**Supported Operations:**
- Sign in with providers
- Sign out
- Session management
- CSRF token generation

**Example Sign In Request:**
```bash
POST /api/auth/signin/google
```

**Session Response:**
```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://..."
  },
  "expires": "2024-12-31T23:59:59.999Z"
}
```

## Health Check

### GET /api/health

Provides comprehensive health status for monitoring and load balancing.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "profilebuilder",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "memory": {
      "used": 45,
      "total": 100,
      "unit": "MB"
    }
  },
  "responseTime": 15
}
```

**Response (500):**
```json
{
  "status": "unhealthy",
  "service": "profilebuilder",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Database connection failed"
}
```

## Resumes

### GET /api/resumes

Retrieve a paginated list of resumes with optional filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `locale` (string): Filter by locale
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order - 'asc' or 'desc' (default: desc)
- `includeContent` (boolean): Include full content (default: false)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Software Engineer Resume",
      "locale": "en-US",
      "version": 1,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST /api/resumes

Create a new resume.

**Request Body:**
```json
{
  "title": "Software Engineer Resume",
  "locale": "en-US",
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "summary": "Experienced software engineer...",
  "workExperience": [
    {
      "company": "Tech Corp",
      "position": "Senior Developer",
      "startDate": "2020-01-01",
      "endDate": "2023-12-31",
      "description": "Led development of..."
    }
  ],
  "education": [
    {
      "institution": "University of Tech",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "graduationDate": "2019-05-15"
    }
  ],
  "skills": ["JavaScript", "React", "Node.js"],
  "projects": [
    {
      "name": "Portfolio Website",
      "description": "Personal portfolio built with React",
      "technologies": ["React", "CSS", "JavaScript"]
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Software Engineer Resume",
    "locale": "en-US",
    "version": 1,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### GET /api/resumes/{id}

Retrieve a specific resume by ID.

**Query Parameters:**
- `includeContent` (boolean): Include full content (default: true)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Software Engineer Resume",
    "locale": "en-US",
    "personalInfo": { ... },
    "summary": "Experienced software engineer...",
    "workExperience": [ ... ],
    "education": [ ... ],
    "skills": [ ... ],
    "version": 1,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### PUT /api/resumes/{id}

Update an existing resume.

**Request Body:** Same as POST, but all fields optional.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Updated Resume Title",
    "version": 2,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### DELETE /api/resumes/{id}

Delete a resume by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/resumes/{id}/comments

Add a comment to a specific resume field.

**Request Body:**
```json
{
  "field": "workExperience",
  "text": "Consider adding more quantifiable achievements",
  "author": "John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "field": "workExperience",
      "text": "Consider adding more quantifiable achievements",
      "author": "John Doe",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

## Cover Letters

### POST /api/cover-letter

Generate a cover letter from provided data.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "recipientName": "Jane Smith",
  "companyName": "Tech Corp",
  "body": "I am writing to express my interest in the Software Engineer position...",
  "template": "classic",
  "address": "123 Main St, City, State 12345",
  "phone": "+1-555-0123",
  "date": "2024-01-15",
  "recipientTitle": "HR Manager",
  "companyAddress": "456 Business Ave, City, State 12345",
  "salutation": "Dear Ms. Smith,",
  "closing": "Sincerely,",
  "signature": "John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "coverLetter": "John Doe\n123 Main St, City, State 12345\n+1-555-0123\njohn@example.com\n\n2024-01-15\n\nJane Smith\nHR Manager\nTech Corp\n456 Business Ave, City, State 12345\n\nDear Ms. Smith,\n\nI am writing to express my interest in the Software Engineer position...\n\nSincerely,\n\nJohn Doe",
    "template": "classic"
  }
}
```

### GET /api/cover-letter

Retrieve available cover letter templates.

**Response (200):**
```json
{
  "success": true,
  "templates": [
    {
      "id": "classic",
      "name": "Classic Template"
    },
    {
      "id": "modern",
      "name": "Modern Template"
    }
  ]
}
```

## User Management

### GET /api/user/data

Export user data (requires authentication).

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "privacyMode": false
  },
  "resumes": [
    {
      "title": "Software Engineer Resume",
      "locale": "en-US",
      "version": 1,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "_metadata": {
    "resumeCount": 1,
    "limited": false,
    "note": "Resume data is limited to metadata only for performance and security"
  }
}
```

### GET /api/user/settings

Retrieve user settings (requires authentication).

**Response (200):**
```json
{
  "privacyMode": false
}
```

### PUT /api/user/settings

Update user settings (requires authentication).

**Request Body:**
```json
{
  "privacyMode": true
}
```

**Response (200):**
```json
{
  "privacyMode": true
}
```

### DELETE /api/user/delete

Delete user account and all associated data (requires authentication).

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

## File Upload

### POST /api/upload

Upload a file to the server.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload (max 10MB, supported: JPEG, PNG, GIF, PDF)

**Response (200):**
```json
{
  "success": true,
  "url": "/uploads/1705312200000-sample.pdf"
}
```

## DOCX Import and Generation

The DOCX endpoints provide functionality to import existing DOCX resume files and generate new DOCX documents from resume data. These endpoints support ATS-safe formatting and secure data processing.

### POST /api/import-docx

Import and parse a DOCX resume file into structured resume data.

**Content-Type:** `multipart/form-data`

**Authentication:** Required (valid session)

**Form Data:**
- `file`: DOCX file to import (max 10MB, .docx only)

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/import-docx" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.docx"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "summary": "Experienced software engineer with 5+ years...",
    "workExperience": [
      {
        "title": "Senior Developer",
        "company": "Tech Corp",
        "description": "Led development of web applications"
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "university": "University of Tech"
      }
    ],
    "skills": ["JavaScript", "React", "Node.js"],
    "tables": [
      {
        "rows": [
          ["Skill", "Level"],
          ["JavaScript", "Expert"],
          ["React", "Advanced"]
        ]
      }
    ],
    "bullets": [
      "Led cross-functional teams",
      "Implemented CI/CD pipelines"
    ]
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST`: Invalid file format or size exceeded
- `401 UNAUTHORIZED`: Authentication required
- `413 PAYLOAD_TOO_LARGE`: File exceeds maximum size
- `422 UNPROCESSABLE_ENTITY`: DOCX parsing failed or invalid content

**Security Notes:**
- Files are scanned for malware before processing
- All extracted text is sanitized to prevent XSS
- Temporary files are deleted after processing
- Rate limited to 10 imports per hour per user

### POST /api/generate-docx

Generate a DOCX document from resume data with ATS-safe formatting.

**Content-Type:** `application/json`

**Authentication:** Required (valid session)

**Request Body:**
```json
{
  "resumeData": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "summary": "Experienced software engineer...",
    "workExperience": [
      {
        "title": "Senior Developer",
        "company": "Tech Corp",
        "startDate": "2020-01-01",
        "endDate": "2023-12-31",
        "description": "Led development of web applications"
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "university": "University of Tech",
        "graduationDate": "2019-05-15"
      }
    ],
    "skills": ["JavaScript", "React", "Node.js"]
  },
  "template": "ats-safe"
}
```

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/generate-docx" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "resumeData": {
      "personalInfo": {"firstName": "John", "lastName": "Doe"},
      "summary": "Experienced developer",
      "skills": ["JavaScript", "React"]
    }
  }'
```

**Response (200):**
Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
Content-Disposition: `attachment; filename="resume.docx"`

(Binary DOCX file data)

**Error Responses:**
- `400 BAD_REQUEST`: Invalid resume data or validation failed
- `401 UNAUTHORIZED`: Authentication required
- `422 UNPROCESSABLE_ENTITY`: Document generation failed

**Security Notes:**
- All input data is validated and sanitized
- Generated documents use ATS-safe formatting (Arial font, no graphics)
- No executable content or macros in generated files
- Rate limited to 50 generations per hour per user

**Ethical Considerations:**
- Resume data contains sensitive personal information (PII)
- Data is processed temporarily and not stored without consent
- Users retain ownership of their resume data
- Processing complies with GDPR and privacy regulations
- Fairness: Algorithms do not discriminate based on protected characteristics

## Locales

### GET /api/locales

Retrieve available locale configurations.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "code": "en-US",
      "name": "English (United States)",
      "sections": {
        "personalInfo": {
          "label": "Personal Information",
          "fields": {
            "firstName": { "label": "First Name", "type": "text", "required": true },
            "lastName": { "label": "Last Name", "type": "text", "required": true },
            "email": { "label": "Email", "type": "email", "required": true }
          }
        }
      }
    }
  ]
}
```

### GET /api/locales/{locale}

Retrieve configuration for a specific locale.

**Response (200):** Same structure as above, filtered for the specific locale.

## Metrics

### GET /api/metrics

Retrieve Prometheus-compatible metrics for monitoring.

**Response (200):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status="200"} 150

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/health",le="0.1"} 140
http_request_duration_seconds_bucket{method="GET",route="/api/health",le="0.5"} 9
http_request_duration_seconds_bucket{method="GET",route="/api/health",le="1"} 1
http_request_duration_seconds_bucket{method="GET",route="/api/health",le="+Inf"} 0
http_request_duration_seconds_sum{method="GET",route="/api/health"} 15.5
http_request_duration_seconds_count{method="GET",route="/api/health"} 150
```

## Error Codes

All API errors follow a standardized format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `BAD_REQUEST` | 400 | Invalid request format |

### Validation Error Example

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "title": "Title is required and must be less than 100 characters"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints:** 100 requests per minute per IP
- **Authentication endpoints:** 5 requests per minute per IP
- **File upload endpoints:** 10 requests per hour per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

## Security

### Security Headers

All API responses include comprehensive security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Authentication Requirements

- User-specific endpoints require valid session
- File uploads require authenticated users
- Admin endpoints require appropriate permissions

### Data Privacy

- All data transmission over HTTPS
- Sensitive data is encrypted at rest
- User consent required for data processing
- GDPR-compliant data deletion endpoints

### Input Validation

- All inputs are validated and sanitized
- File uploads restricted to allowed types and sizes
- SQL injection prevention through parameterized queries
- XSS prevention through input sanitization

## SDKs and Libraries

### JavaScript/TypeScript

```javascript
// Example API client
class CareerVerveAPI {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  async getResumes(params = {}) {
    const query = new URLSearchParams(params);
    const response = await fetch(`${this.baseURL}/resumes?${query}`);
    return response.json();
  }

  async createResume(data) {
    const response = await fetch(`${this.baseURL}/resumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

### cURL Examples

```bash
# Get resumes with pagination
curl -X GET "https://api.careerverve.com/api/resumes?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a new resume
curl -X POST "https://api.careerverve.com/api/resumes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "My Resume",
    "locale": "en-US",
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }'

# Upload a file
curl -X POST "https://api.careerverve.com/api/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

## Changelog

### Version 1.0.0
- Initial release
- Basic CRUD operations for resumes
- Cover letter generation
- User authentication and management
- File upload functionality
- Health check and metrics endpoints
- Comprehensive error handling and validation

### Version 1.1.0 (Phase 12)
- Added DOCX import and generation endpoints
- DOCX parsing with table and bullet extraction
- ATS-safe DOCX document generation
- Enhanced security for document processing
- Ethical considerations for sensitive resume data handling

## Support

For API support, please contact:
- **Email:** api-support@careerverve.com
- **Documentation:** https://docs.careerverve.com
- **Status Page:** https://status.careerverve.com

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/health` | 1000 req/min | 1 minute |
| `/api/resumes` | 100 req/min | 1 minute |
| `/api/auth/*` | 5 req/min | 1 minute |
| `/api/upload` | 10 req/hour | 1 hour |
| `/api/import-docx` | 10 req/hour | 1 hour |
| `/api/generate-docx` | 50 req/hour | 1 hour |
| `/api/user/*` | 50 req/min | 1 minute |

## Webhooks

The API supports webhooks for real-time notifications:

### Supported Events
- `resume.created`
- `resume.updated`
- `resume.deleted`
- `user.created`
- `user.deleted`

### Webhook Payload Example
```json
{
  "event": "resume.created",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "New Resume",
    "userId": "user123"
  }
}
```

To register a webhook, contact support with your endpoint URL and desired events.