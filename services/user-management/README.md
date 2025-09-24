# User Management Service

A microservice for managing user accounts, audit logs, consent records, and GDPR erasure requests in the CareerVerve application.

## Overview

The User Management Service is responsible for:
- User account lifecycle management (CRUD operations)
- Authentication and authorization
- Audit logging for compliance and security
- Consent management for GDPR compliance
- Data erasure requests handling
- Health monitoring and observability

## Architecture

- **Framework:** Node.js with Express.js
- **Database:** MongoDB with separate database (`user_management_db`)
- **Authentication:** JWT tokens with service-to-service API keys
- **Security:** Field-level encryption for sensitive data
- **Observability:** Health checks, metrics, and structured logging

## API Endpoints

**Base URL:** `http://user-management-service:3001/api/v1`

### Authentication

All endpoints except user creation require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Service-to-service calls use API keys:
```
X-API-Key: <service_api_key>
```

### Users API

#### GET /api/v1/users/{id}

Retrieve user information by ID.

**Authentication:** Required (JWT - user owns resource or admin)

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
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

**Rate Limit:** 1000 requests/minute

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

**Validation Rules:**
- `email`: Required, valid email format, max 254 characters, unique
- `name`: Optional, max 100 characters
- `privacyMode`: Optional, boolean, default false

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

**Rate Limit:** 100 requests/minute

#### PUT /api/v1/users/{id}

Update user information.

**Authentication:** Required (JWT - user owns resource or admin)

**Request Body:** (all fields optional)
```json
{
  "name": "John Smith",
  "privacyMode": true
}
```

**Response (200):** Updated user object (same as GET response)

**Error Responses:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Validation failed

#### DELETE /api/v1/users/{id}

Delete user account and all associated data (GDPR compliance).

**Authentication:** Required (JWT - user owns resource or admin)

**Process:**
1. Mark user as deleted (soft delete)
2. Queue data erasure job
3. Log deletion in audit trail
4. Anonymize associated data in other services

**Response (200):**
```json
{
  "message": "User deletion initiated successfully",
  "erasureRequestId": "erase-12345"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

### Audit Logs API

#### GET /api/v1/audit/users/{userId}

Retrieve audit logs for a specific user.

**Authentication:** Required (JWT - user owns resource or admin)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 200)
- `action` (string): Filter by action type
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string

**Response (200):**
```json
{
  "logs": [
    {
      "id": "audit-12345",
      "userId": "user123",
      "action": "access",
      "resourceType": "user",
      "resourceId": "user123",
      "performedBy": "user123",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "details": "User profile accessed",
      "timestamp": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Consent Management API

#### GET /api/v1/consent/users/{userId}

Retrieve user consent records.

**Authentication:** Required (JWT - user owns resource or admin)

#### POST /api/v1/consent

Record user consent.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "userId": "user123",
  "consentType": "data_processing",
  "version": "1.0",
  "granted": true,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### GDPR Erasure API

#### POST /api/v1/erasure

Initiate GDPR data erasure request.

**Authentication:** Required (JWT - user owns resource)

**Request Body:**
```json
{
  "userId": "user123",
  "reason": "User requested account deletion",
  "confirmation": true
}
```

**Response (201):**
```json
{
  "erasureRequestId": "erase-12345",
  "status": "pending",
  "estimatedCompletion": "2024-01-22T10:00:00.000Z"
}
```

#### GET /api/v1/erasure/{requestId}

Check erasure request status.

**Authentication:** Required (JWT - request owner or admin)

### Health & Monitoring API

#### GET /api/v1/health

Comprehensive health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "user-management",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "memory": {
      "used": 45,
      "total": 100,
      "unit": "MB"
    }
  },
  "responseTime": 15
}
```

#### GET /api/v1/metrics

Prometheus-compatible metrics.

**Response (200):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/v1/users",status="200"} 1500

# HELP user_registrations_total Total user registrations
# TYPE user_registrations_total counter
user_registrations_total 1250
```

## Data Models

### User Schema
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

### AuditLog Schema
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'access']
  },
  resourceType: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    required: true
  },
  performedBy: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  details: String,
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}
```

### ConsentRecord Schema
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  consentType: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  granted: {
    type: Boolean,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  grantedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: Date
}
```

### ErasureRequest Schema
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  reason: String,
  requestedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  error: String
}
```

## Security

### Authentication & Authorization

- **JWT Tokens:** 1-hour expiration, refresh token support
- **API Keys:** Service-to-service authentication
- **Role-Based Access:** User, Admin, Service roles
- **Audit Logging:** All user actions logged immutably

### Data Protection

- **Encryption at Rest:** AES-256 for sensitive fields
- **Field-Level Encryption:** MongoDB client-side encryption
- **Data Sanitization:** Input validation and sanitization
- **GDPR Compliance:** Right to erasure, consent management

### Input Validation

- **Schema Validation:** Joi validation schemas
- **Rate Limiting:** Per-user and global limits
- **SQL Injection Prevention:** Parameterized queries
- **XSS Prevention:** Input sanitization

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | Required |
| `PORT` | Service port | 3001 |
| `JWT_SECRET` | JWT signing secret | Required |
| `LOG_LEVEL` | Logging level | info |
| `NODE_ENV` | Environment | development |
| `ENCRYPTION_KEY` | Data encryption key | Required |
| `API_KEYS` | Service API keys (JSON) | Required |

## Dependencies

- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT handling
- `joi`: Input validation
- `winston`: Logging
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
docker build -t user-management-service .
docker run -p 3001:3001 \
  -e MONGO_URI=mongodb://localhost:27017/user_management_db \
  -e JWT_SECRET=your-secret \
  user-management-service
```

## API Versioning

- **Current Version:** v1 (`/api/v1/`)
- **Versioning Strategy:** URL path versioning
- **Backward Compatibility:** Maintained for 12 months after deprecation
- **Deprecation Headers:** `Deprecation: true` with sunset date

## Error Handling

All errors follow a standardized format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "user-management"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `UNPROCESSABLE_ENTITY` | 422 | Business logic error |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Monitoring & Observability

### Health Checks

- **Endpoint:** `/health`
- **Checks:** Database connectivity, memory usage
- **Format:** JSON response with detailed status

### Metrics

- **Endpoint:** `/metrics`
- **Format:** Prometheus exposition format
- **Metrics:** HTTP requests, response times, error rates, user registrations

### Logging

- **Format:** Structured JSON logs
- **Correlation IDs:** Request tracing across services
- **Levels:** error, warn, info, debug
- **Destinations:** Console, file, external service

## Compliance

### GDPR Compliance

- **Data Minimization:** Only necessary PII collected
- **Right to Erasure:** Complete data deletion with audit trail
- **Consent Management:** Granular consent tracking
- **Data Portability:** User data export functionality
- **Breach Notification:** Automated breach detection and notification

### Security Standards

- **OWASP Top 10:** Protection against common vulnerabilities
- **Data Encryption:** AES-256 encryption for sensitive data
- **Access Controls:** Least privilege principle
- **Audit Trails:** Immutable logging of all user actions

## Inter-Service Communication

### Synchronous Calls

```javascript
// Example call to Resume Management Service
const response = await axios.get(
  'http://resume-management-service:3002/api/v1/resumes/user/' + userId,
  {
    headers: {
      'Authorization': 'Bearer ' + serviceToken,
      'X-API-Key': process.env.RESUME_SERVICE_KEY
    }
  }
);
```

### Event Publishing

Publishes events to message queue:
- `user.created`
- `user.updated`
- `user.deleted`
- `consent.granted`
- `erasure.requested`

## Performance

### Database Indexes

```javascript
// Optimized indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
consentRecordSchema.index({ userId: 1, consentType: 1 });
```

### Caching Strategy

- **User Sessions:** Redis caching for JWT validation
- **Rate Limits:** In-memory caching with Redis backup
- **Configuration:** Environment variables with hot reload

### Scalability

- **Horizontal Scaling:** Stateless design
- **Database Sharding:** User-based sharding strategy
- **Load Balancing:** Kubernetes service mesh
- **Circuit Breakers:** Resilience patterns for dependent services

## Testing

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### Contract Tests

```bash
npm run test:contract
```

### Coverage

- **Target:** 80% code coverage
- **Tools:** Jest, Supertest, Nock
- **Reports:** HTML and LCOV formats

## Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-management
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-management
  template:
    metadata:
      labels:
        app: user-management
    spec:
      containers:
      - name: user-management
        image: careerverve/user-management:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
```

### CI/CD Pipeline

1. **Build:** Docker image creation
2. **Test:** Unit and integration tests
3. **Security Scan:** Vulnerability scanning
4. **Deploy:** Kubernetes rolling update
5. **Monitor:** Health checks and metrics validation

## Support

For issues and questions:

- **Documentation:** [API Reference](../docs/api-reference.md)
- **Issues:** GitHub Issues
- **Support:** api-support@careerverve.com
- **Status:** https://status.careerverve.com

---

*Version: 1.0.0 | Last Updated: 2024-01-15*