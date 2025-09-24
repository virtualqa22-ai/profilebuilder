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
- [Ads](#ads)
- [AI](#ai)
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

## Ads

The Ads endpoints provide functionality for tracking advertisement interactions and retrieving ad configuration settings. These endpoints prioritize user privacy through data anonymization and implement comprehensive security measures.

### POST /api/ads/metrics

Tracks advertisement interaction metrics with privacy protection and rate limiting.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "user_id": "string (required) - User identifier to be anonymized",
  "ad_id": "string (required) - Advertisement identifier",
  "event_type": "string (required) - Type of interaction: 'impression', 'click', 'view', 'hover', 'close'",
  "metadata": "object (optional) - Additional event data"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Metric tracked successfully"
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "user_id": "User ID is required",
    "ad_id": "Ad ID is required"
  }
}
```

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "code": "BAD_REQUEST"
}
```

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/ads/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "ad_id": "ad-banner-001",
    "event_type": "impression",
    "metadata": {
      "size": "banner",
      "position": "sidebar"
    }
  }'
```

### GET /api/ads/config

Retrieves advertisement configuration settings from environment variables.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "adsEnabled": true,
    "adProviders": ["google-adsense", "custom-provider"],
    "maxAdsPerPage": 3
  }
}
```

**Request Example:**
```bash
curl -X GET "https://api.careerverve.com/api/ads/config"
```

**Ad Configuration Schema:**
- `adsEnabled`: boolean - Whether ads are enabled globally
- `adProviders`: array of strings - List of configured ad providers (empty if ads disabled)
- `maxAdsPerPage`: number - Maximum number of ads allowed per page (0-10)

### Security Notes

- **User Anonymization:** User IDs are hashed using SHA-256 with a salt before storage
- **Rate Limiting:** 100 requests per minute per anonymized user ID
- **Input Validation:** All inputs are validated and sanitized
- **No Data Retrieval:** Metrics endpoint is write-only for privacy protection
- **Configuration Security:** Ad settings sourced from secure environment variables

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/ads/metrics` | 100 req/min | 1 minute per user |
| `/api/ads/config` | 1000 req/min | 1 minute |

### Ethical Considerations

- **Privacy Protection:** User data is anonymized and cannot be reverse-engineered
- **Non-Intrusive Ads:** Lazy loading prevents performance impact on page load
- **User Consent:** Ads are only served when explicitly enabled in configuration
- **Transparency:** Clear fallback messages when adblock is detected
- **Fairness:** No discriminatory targeting based on protected characteristics

## AI

The AI endpoints provide AI-powered content processing capabilities including content rewriting, grammar/style suggestions, and content linting. These endpoints implement robust security measures, rate limiting, and ethical AI usage guidelines to ensure safe and responsible AI interactions.

### POST /api/v1/ai/rewrite

Rewrites content using AI with optional style specification. The endpoint supports various writing styles and maintains content meaning while improving clarity and professionalism.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "content": "string (required) - Content to rewrite (max 10,000 characters)",
  "style": "string (optional) - Writing style (e.g., 'professional', 'casual', 'formal')",
  "userId": "string (optional) - User identifier for rate limiting"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": "Rewritten content with improved clarity and professionalism"
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Content is required and must be a string"
}
```

**Response (400 - Content Too Long):**
```json
{
  "success": false,
  "error": "Content exceeds maximum length of 10,000 characters"
}
```

**Response (400 - Unsafe Content):**
```json
{
  "success": false,
  "error": "Content contains unsafe content and cannot be processed."
}
```

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

**Response (503 - Service Unavailable):**
```json
{
  "success": false,
  "error": "Service temporarily unavailable. Please try again later."
}
```

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/v1/ai/rewrite" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I have experience in software development and worked on many projects",
    "style": "professional",
    "userId": "user123"
  }'
```

### POST /api/v1/ai/suggestions

Provides grammar, style, and general improvement suggestions for content. Analyzes text and returns categorized suggestions to help improve writing quality.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "content": "string (required) - Content to analyze (max 10,000 characters)",
  "userId": "string (optional) - User identifier for rate limiting"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "grammar": [
      "Consider using 'I have' instead of 'I got' for formal writing",
      "Add comma after introductory phrase"
    ],
    "style": [
      "Use more active voice to make writing more engaging",
      "Vary sentence length for better readability"
    ],
    "suggestions": [
      "Consider adding specific examples to support your claims",
      "Use bullet points for better organization"
    ]
  }
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Content is required and must be a string"
}
```

**Response (400 - Content Too Long):**
```json
{
  "success": false,
  "error": "Content exceeds maximum length of 10,000 characters"
}
```

**Response (400 - Unsafe Content):**
```json
{
  "success": false,
  "error": "Content contains unsafe content and cannot be processed."
}
```

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

**Response (503 - Service Unavailable):**
```json
{
  "success": false,
  "error": "Service temporarily unavailable. Please try again later."
}
```

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/v1/ai/suggestions" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I got experience in software development. I worked on many projects and learned alot.",
    "userId": "user123"
  }'
```

### POST /api/v1/ai/lint

Detects linting issues, errors, and provides improvement suggestions for content. Performs comprehensive analysis including grammar, style, and structural issues with severity scoring.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "content": "string (required) - Content to analyze (max 10,000 characters)",
  "language": "string (optional) - Language/type of content (default: 'text')",
  "userId": "string (optional) - User identifier for rate limiting"
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
        "message": "Missing comma after introductory phrase",
        "line": 1,
        "column": 15,
        "severity": "warning"
      },
      {
        "type": "style",
        "message": "Use active voice instead of passive",
        "line": 2,
        "column": 5,
        "severity": "info"
      }
    ],
    "score": 85
  }
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Content is required and must be a string"
}
```

**Response (400 - Content Too Long):**
```json
{
  "success": false,
  "error": "Content exceeds maximum length of 10,000 characters"
}
```

**Response (400 - Unsafe Content):**
```json
{
  "success": false,
  "error": "Content contains unsafe content and cannot be processed."
}
```

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

**Response (503 - Service Unavailable):**
```json
{
  "success": false,
  "error": "Service temporarily unavailable. Please try again later."
}
```

**Request Example:**
```bash
curl -X POST "https://api.careerverve.com/api/v1/ai/lint" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I got experience in software development. Projects were worked on by me.",
    "language": "text",
    "userId": "user123"
  }'
```

### Security Notes

- **Input Validation:** All content is validated for length, type, and safety before processing
- **Rate Limiting:** 10 requests per minute per user across all AI endpoints
- **Content Sanitization:** Input prompts are sanitized to prevent injection attacks
- **Output Validation:** AI-generated content is validated for safety and appropriateness
- **Caching:** Results are cached to improve performance and reduce API costs
- **Circuit Breaker:** Automatic failure isolation prevents cascade failures
- **Logging:** All AI interactions are logged for security monitoring

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/ai/rewrite` | 10 req/min | 1 minute per user |
| `/api/v1/ai/suggestions` | 10 req/min | 1 minute per user |
| `/api/v1/ai/lint` | 10 req/min | 1 minute per user |

### Ethical Considerations

- **Privacy Protection:** User content is processed temporarily and not stored without consent
- **Fairness:** AI processing does not discriminate based on protected characteristics
- **Transparency:** Users are informed about AI processing and can opt out
- **Data Minimization:** Only necessary data is processed for the requested operation
- **User Consent:** AI features require explicit user consent and understanding
- **Bias Mitigation:** Regular audits ensure AI responses are fair and unbiased
- **Human Oversight:** Critical decisions involving sensitive data include human review

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

### Version 1.2.0 (Phase 13)
- Added advertisement tracking and configuration endpoints
- Ad metrics tracking with user privacy protection via anonymization
- Ad configuration management via environment variables
- Frontend AdComponent with lazy loading and adblock detection
- Ethical ad serving with user consent and non-intrusive placement

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
| `/api/ads/metrics` | 100 req/min | 1 minute per user |
| `/api/ads/config` | 1000 req/min | 1 minute |

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