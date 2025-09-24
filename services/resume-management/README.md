# Resume Management Service

A microservice for managing resumes and user-specific data in the CareerVerve application.

## Overview

The Resume Management Service handles:
- Resume CRUD operations with user isolation
- Content encryption and security
- Comment system for collaborative editing
- Template management
- Version control for resume changes
- Health monitoring and observability

## Architecture

- **Framework:** Node.js with Express.js
- **Database:** MongoDB with separate database (`resume_management_db`)
- **Security:** Field-level encryption for sensitive resume data
- **Authentication:** JWT tokens with user-based access control
- **Observability:** Health checks, metrics, and structured logging

## API Endpoints

**Base URL:** `http://resume-management-service:3002/api/v1`

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Service-to-service calls use API keys:
```
X-API-Key: <service_api_key>
```

### Resumes API

#### GET /api/v1/resumes/{id}

Retrieve a specific resume by ID.

**Authentication:** Required (JWT - user owns resume)

**Parameters:**
- `id` (path): Resume ID (MongoDB ObjectId)
- `includeContent` (query): Include full content (default: true)

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "title": "Software Engineer Resume",
  "content": "encrypted_resume_content_here",
  "locale": "en-US",
  "version": 1,
  "photos": "encrypted_photo_data",
  "certifications": "encrypted_certifications",
  "hobbies": "encrypted_hobbies",
  "references": "encrypted_references",
  "comments": [
    {
      "field": "workExperience",
      "text": "Consider adding quantifiable achievements",
      "author": "AI Assistant",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: User doesn't own resume
- `404 Not Found`: Resume not found

**Rate Limit:** 2000 requests/minute

#### GET /api/v1/resumes/user/{userId}

Retrieve all resumes for a specific user.

**Authentication:** Required (JWT - user owns data or admin)

**Parameters:**
- `userId` (path): User ID
- `page` (query): Page number (default: 1)
- `limit` (query): Items per page (default: 10, max: 100)
- `locale` (query): Filter by locale
- `sortBy` (query): Sort field (default: createdAt)
- `sortOrder` (query): Sort order 'asc' or 'desc' (default: desc)

**Response (200):**
```json
{
  "resumes": [
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

#### POST /api/v1/resumes

Create a new resume.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "userId": "user123",
  "title": "Software Engineer Resume",
  "content": "Resume content in JSON format...",
  "locale": "en-US",
  "photos": "base64_encoded_photos",
  "certifications": "Certification details...",
  "hobbies": "Hobby information...",
  "references": "Reference contacts..."
}
```

**Validation Rules:**
- `userId`: Required, valid ObjectId
- `title`: Required, max 100 characters
- `content`: Required, encrypted automatically
- `locale`: Required, valid locale code
- All other fields: Optional, encrypted if provided

**Response (201):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "title": "Software Engineer Resume",
  "locale": "en-US",
  "version": 1,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid token
- `422 Unprocessable Entity`: Validation failed

#### PUT /api/v1/resumes/{id}

Update an existing resume.

**Authentication:** Required (JWT - user owns resume)

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Resume Title",
  "content": "Updated resume content...",
  "photos": "new_photos_data"
}
```

**Process:**
1. Validate user ownership
2. Increment version number
3. Encrypt sensitive fields
4. Update timestamp
5. Log change in audit trail

**Response (200):** Updated resume object

#### DELETE /api/v1/resumes/{id}

Delete a resume.

**Authentication:** Required (JWT - user owns resume)

**Process:**
1. Soft delete (mark as deleted)
2. Queue cleanup job for encrypted data
3. Remove from search indexes
4. Log deletion

**Response (200):**
```json
{
  "message": "Resume deleted successfully"
}
```

### Comments API

#### POST /api/v1/resumes/{id}/comments

Add a comment to a resume field.

**Authentication:** Required (JWT - user owns resume or collaborator)

**Request Body:**
```json
{
  "field": "workExperience",
  "text": "Consider adding more quantifiable achievements",
  "author": "AI Assistant"
}
```

**Response (200):**
```json
{
  "comments": [
    {
      "field": "workExperience",
      "text": "Consider adding more quantifiable achievements",
      "author": "AI Assistant",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/resumes/{id}/comments

Retrieve comments for a resume.

**Authentication:** Required (JWT - user owns resume)

#### PUT /api/v1/resumes/{id}/comments/{commentId}

Update a comment.

**Authentication:** Required (JWT - comment author)

#### DELETE /api/v1/resumes/{id}/comments/{commentId}

Delete a comment.

**Authentication:** Required (JWT - comment author or resume owner)

### Templates API

#### GET /api/v1/templates

Retrieve available resume templates.

**Response (200):**
```json
{
  "templates": [
    {
      "id": "modern",
      "name": "Modern Template",
      "description": "Clean, contemporary design",
      "preview": "template_preview_url",
      "fields": ["personalInfo", "summary", "workExperience", "education"]
    }
  ]
}
```

#### GET /api/v1/templates/{id}

Retrieve template configuration.

**Response (200):**
```json
{
  "id": "modern",
  "name": "Modern Template",
  "schema": {
    "personalInfo": {
      "firstName": { "type": "text", "required": true },
      "lastName": { "type": "text", "required": true },
      "email": { "type": "email", "required": true }
    }
  },
  "styles": {
    "fontFamily": "Arial",
    "fontSize": "11pt",
    "margin": "0.5in"
  }
}
```

### Health & Monitoring API

#### GET /api/v1/health

Service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "resume-management",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12
    },
    "encryption": {
      "status": "healthy"
    }
  }
}
```

#### GET /api/v1/metrics

Prometheus-compatible metrics.

**Response (200):**
```
# HELP resume_operations_total Total resume operations
# TYPE resume_operations_total counter
resume_operations_total{operation="create",status="success"} 1250
resume_operations_total{operation="update",status="success"} 3200

# HELP resume_encryption_duration_seconds Time spent encrypting resume data
# TYPE resume_encryption_duration_seconds histogram
resume_encryption_duration_seconds_bucket{le="0.1"} 4800
```

## Data Models

### Resume Schema
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    encrypted: true  // Automatically encrypted
  },
  locale: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  photos: {
    type: String,
    encrypted: true
  },
  certifications: {
    type: String,
    encrypted: true
  },
  hobbies: {
    type: String,
    encrypted: true
  },
  references: {
    type: String,
    encrypted: true
  },
  comments: [{
    field: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    author: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

### ResumeTemplate Schema
```javascript
{
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  schema: {
    type: Object,
    required: true
  },
  styles: {
    type: Object,
    required: true
  },
  preview: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

## Security

### Data Protection

- **Field-Level Encryption:** AES-256 encryption for sensitive fields
- **User Isolation:** Strict user-based access control
- **Content Encryption:** Resume content encrypted at rest and in transit
- **Audit Logging:** All resume operations logged

### Access Control

- **User Ownership:** Users can only access their own resumes
- **Collaborator Access:** Future support for shared editing
- **Admin Override:** Administrative access for support
- **API Key Authentication:** Service-to-service calls

### Input Validation

- **Schema Validation:** Comprehensive input validation
- **Content Sanitization:** XSS prevention
- **Size Limits:** Maximum content sizes enforced
- **Type Checking:** Strict type validation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | Required |
| `PORT` | Service port | 3002 |
| `JWT_SECRET` | JWT verification (from User Management) | Required |
| `ENCRYPTION_KEY` | Data encryption key | Required |
| `LOG_LEVEL` | Logging level | info |
| `NODE_ENV` | Environment | development |
| `MAX_RESUME_SIZE` | Max resume content size (MB) | 5 |
| `USER_MANAGEMENT_URL` | User Management service URL | Required |

## Dependencies

- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT verification
- `crypto-js`: Data encryption
- `joi`: Input validation
- `winston`: Structured logging
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting
- `prometheus-api-metrics`: Metrics collection

## Development

### Running Locally

```bash
npm install
npm run dev
```

### Testing

```bash
npm test
npm run test:coverage
```

### Docker

```bash
docker build -t resume-management-service .
docker run -p 3002:3002 \
  -e MONGO_URI=mongodb://localhost:27017/resume_management_db \
  -e JWT_SECRET=your-jwt-secret \
  -e ENCRYPTION_KEY=your-encryption-key \
  resume-management-service
```

## API Versioning

- **Current Version:** v1 (`/api/v1/`)
- **Backward Compatibility:** Maintained for 12 months
- **Deprecation Process:** Version headers with sunset dates

## Error Handling

Standardized error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "resume-management"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resume not found |
| `CONFLICT` | 409 | Version conflict |
| `UNPROCESSABLE_ENTITY` | 422 | Business logic error |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Performance

### Database Optimization

```javascript
// Optimized indexes
resumeSchema.index({ userId: 1 });
resumeSchema.index({ locale: 1 });
resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ updatedAt: -1 });
resumeSchema.index({ locale: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, updatedAt: -1 });
```

### Caching Strategy

- **Template Caching:** Redis caching for template schemas
- **User Session Data:** Cached user permissions
- **Rate Limit Counters:** Distributed rate limiting

### Encryption Performance

- **Lazy Decryption:** Content decrypted only when accessed
- **Batch Operations:** Bulk encryption/decryption
- **Key Rotation:** Automated encryption key rotation

## Monitoring & Observability

### Health Checks

- **Database Connectivity:** MongoDB connection health
- **Encryption Service:** Encryption key validation
- **Memory Usage:** Heap and garbage collection monitoring

### Metrics

- **Resume Operations:** Create, read, update, delete counters
- **Encryption Performance:** Encryption/decryption timing
- **User Activity:** Resume access patterns
- **Error Rates:** Per-endpoint error tracking

### Logging

- **Structured Logs:** JSON format with correlation IDs
- **Security Events:** All access attempts logged
- **Performance Logs:** Slow query monitoring
- **Audit Trail:** Immutable operation logs

## Compliance

### Data Privacy

- **Data Encryption:** All sensitive data encrypted
- **Access Logging:** Comprehensive audit trails
- **Data Retention:** Configurable retention policies
- **User Consent:** Resume processing requires consent

### GDPR Compliance

- **Right to Access:** Users can export their resume data
- **Right to Erasure:** Complete data deletion
- **Data Portability:** Resume data export in standard formats
- **Consent Management:** Granular privacy controls

## Inter-Service Communication

### Synchronous Calls

```javascript
// Validate user exists before creating resume
const userResponse = await axios.get(
  'http://user-management-service:3001/api/v1/users/' + userId,
  {
    headers: {
      'Authorization': 'Bearer ' + serviceToken,
      'X-API-Key': process.env.USER_SERVICE_KEY
    }
  }
);
```

### Event Publishing

Publishes events to message queue:
- `resume.created`
- `resume.updated`
- `resume.deleted`
- `comment.added`

### Circuit Breaker Pattern

```javascript
// Circuit breaker for User Management calls
const userServiceBreaker = new CircuitBreaker(async (userId) => {
  return await validateUser(userId);
}, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

## Testing

### Test Categories

- **Unit Tests:** Individual functions and modules
- **Integration Tests:** Database and API interactions
- **Contract Tests:** API contract validation
- **Security Tests:** Encryption and access control

### Test Coverage

- **Target:** 80% code coverage
- **Critical Paths:** 95% coverage for core functionality
- **Tools:** Jest, Supertest, MongoDB Memory Server

## Deployment

### Kubernetes Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resume-management
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resume-management
  template:
    metadata:
      labels:
        app: resume-management
    spec:
      containers:
      - name: resume-management
        image: careerverve/resume-management:v1.0.0
        ports:
        - containerPort: 3002
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: encryption-secret
              key: key
```

### Scaling Strategy

- **Horizontal Pod Autoscaling:** CPU and memory based scaling
- **Database Sharding:** User-based data distribution
- **Read Replicas:** Separate read and write databases
- **CDN Integration:** Static asset delivery

## Support

For issues and questions:

- **API Documentation:** [Central API Reference](../docs/api-reference.md)
- **Issues:** GitHub Issues
- **Support:** api-support@careerverve.com
- **Status:** https://status.careerverve.com

---

*Version: 1.0.0 | Last Updated: 2024-01-15*