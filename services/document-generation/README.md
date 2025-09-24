# Document Generation Service

A microservice for generating ATS-safe DOCX documents from resume data in the CareerVerve platform.

## Overview

The Document Generation Service handles:
- DOCX document creation from structured resume data
- ATS-safe formatting (Arial font, no graphics, standard layouts)
- Template-based document generation
- Secure document processing with virus scanning
- Batch document generation
- Document format conversion and optimization

## Architecture

- **Framework:** Node.js with Express.js
- **Document Library:** docx library for DOCX generation
- **Security:** Input validation, content sanitization
- **Storage:** Temporary file processing with cleanup
- **Observability:** Health checks, metrics, and structured logging

## API Endpoints

**Base URL:** `http://document-generation-service:3004/api/v1`

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Service-to-service calls use API keys:
```
X-API-Key: <service_api_key>
```

### Document Generation API

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
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "address": "123 Main St, City, State 12345"
    },
    "summary": "Experienced software engineer with 5+ years...",
    "workExperience": [
      {
        "company": "Tech Corp",
        "position": "Senior Developer",
        "startDate": "2020-01-01",
        "endDate": "2023-12-31",
        "description": "Led development of web applications using React and Node.js"
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "field": "Computer Science",
        "university": "University of Tech",
        "graduationDate": "2019-05-15"
      }
    ],
    "skills": ["JavaScript", "React", "Node.js", "Python"],
    "certifications": ["AWS Certified Developer", "Google Cloud Professional"]
  },
  "template": "ats-safe",
  "userId": "user123",
  "options": {
    "fontSize": 11,
    "fontFamily": "Arial",
    "margins": {
      "top": 1,
      "bottom": 1,
      "left": 1,
      "right": 1
    }
  }
}
```

**Validation Rules:**
- `resumeData`: Required, valid resume structure
- `template`: Optional, default "ats-safe"
- `userId`: Required for tracking
- `options`: Optional formatting options

**Response (200):** Binary DOCX file
**Content-Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
**Content-Disposition:** `attachment; filename="resume.docx"`

**Processing Steps:**
1. Validate resume data structure
2. Sanitize all text content
3. Apply ATS-safe formatting
4. Generate DOCX document
5. Virus scan the generated file
6. Stream file to client
7. Clean up temporary files

**Error Responses:**
- `400 Bad Request`: Invalid resume data or validation failed
- `401 Unauthorized`: Invalid authentication
- `413 Payload Too Large`: Resume data exceeds size limits
- `422 Unprocessable Entity`: Document generation failed
- `429 Too Many Requests`: Rate limit exceeded

**Rate Limit:** 50 requests/hour per user

#### POST /api/v1/documents/generate/batch

Generate multiple DOCX documents in batch.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "documents": [
    {
      "id": "doc1",
      "resumeData": { ... },
      "template": "ats-safe",
      "filename": "john-doe-resume.docx"
    },
    {
      "id": "doc2",
      "resumeData": { ... },
      "template": "modern",
      "filename": "jane-smith-resume.docx"
    }
  ],
  "userId": "user123",
  "format": "zip"
}
```

**Response (200):** ZIP file containing all generated documents
**Content-Type:** `application/zip`
**Content-Disposition:** `attachment; filename="resumes.zip"`

#### GET /api/v1/documents/templates

Retrieve available document templates.

**Authentication:** Required (JWT)

**Response (200):**
```json
{
  "templates": [
    {
      "id": "ats-safe",
      "name": "ATS-Safe Template",
      "description": "Optimized for applicant tracking systems",
      "preview": "/templates/ats-safe-preview.png",
      "features": ["Arial font", "Standard margins", "No graphics", "Clean layout"]
    },
    {
      "id": "modern",
      "name": "Modern Template",
      "description": "Contemporary design with subtle styling",
      "preview": "/templates/modern-preview.png",
      "features": ["Calibri font", "Color accents", "Professional layout"]
    }
  ]
}
```

#### GET /api/v1/documents/templates/{id}

Retrieve template configuration and schema.

**Authentication:** Required (JWT)

**Response (200):**
```json
{
  "id": "ats-safe",
  "name": "ATS-Safe Template",
  "schema": {
    "sections": ["personalInfo", "summary", "workExperience", "education", "skills"],
    "maxLength": {
      "summary": 500,
      "workExperience": 1000
    },
    "formatting": {
      "fontFamily": "Arial",
      "fontSize": 11,
      "lineHeight": 1.15
    }
  },
  "sample": "/templates/ats-safe-sample.docx"
}
```

### Document Import API

#### POST /api/v1/documents/import

Import and parse existing DOCX resume files.

**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: DOCX file (max 10MB, .docx only)
- `userId`: User identifier
- `extractImages`: Boolean, extract images (default: false)

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
    "summary": "Experienced software engineer...",
    "workExperience": [
      {
        "company": "Tech Corp",
        "position": "Senior Developer",
        "description": "Led development of web applications"
      }
    ],
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
    ],
    "metadata": {
      "pageCount": 2,
      "wordCount": 450,
      "hasTables": true,
      "hasImages": false
    }
  }
}
```

**Processing Steps:**
1. Validate file type and size
2. Virus scan the uploaded file
3. Parse DOCX structure
4. Extract text, tables, and formatting
5. Structure data into resume format
6. Return parsed data

**Error Responses:**
- `400 Bad Request`: Invalid file format
- `413 Payload Too Large`: File exceeds maximum size
- `422 Unprocessable Entity`: DOCX parsing failed

**Rate Limit:** 10 requests/hour per user

### Health & Monitoring API

#### GET /api/v1/health

Service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "document-generation",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "fileSystem": {
      "status": "healthy",
      "tempSpace": "2.1GB"
    },
    "virusScanner": {
      "status": "healthy",
      "lastScan": "2024-01-15T10:25:00.000Z"
    }
  }
}
```

#### GET /api/v1/metrics

Prometheus-compatible metrics.

**Response (200):**
```
# HELP document_generation_total Total documents generated
# TYPE document_generation_total counter
document_generation_total{template="ats-safe",status="success"} 1250
document_generation_total{template="modern",status="success"} 890

# HELP document_generation_duration_seconds Document generation duration
# TYPE document_generation_duration_seconds histogram
document_generation_duration_seconds_bucket{le="1.0"} 1800
document_generation_duration_seconds_bucket{le="2.0"} 320
document_generation_duration_seconds_bucket{le="5.0"} 20

# HELP document_import_total Total documents imported
# TYPE document_import_total counter
document_import_total{status="success"} 450
```

## Security

### File Security

- **Virus Scanning:** ClamAV integration for all files
- **File Type Validation:** Strict MIME type checking
- **Size Limits:** Maximum file size enforcement
- **Content Sanitization:** XSS prevention in extracted text

### Data Protection

- **Temporary Files:** Automatic cleanup after processing
- **No Persistent Storage:** Generated files not stored on server
- **Memory Limits:** Prevent memory exhaustion attacks
- **Input Validation:** Comprehensive schema validation

### Access Control

- **User Isolation:** Files processed in isolated contexts
- **Rate Limiting:** Per-user request limits
- **Audit Logging:** All document operations logged
- **Content Filtering:** Malicious content detection

## Data Models

### Resume Data Schema

```javascript
{
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    linkedIn: String,
    website: String
  },
  summary: String,
  workExperience: [{
    company: String,
    position: String,
    startDate: String,
    endDate: String,
    description: String,
    achievements: [String]
  }],
  education: [{
    degree: String,
    field: String,
    university: String,
    graduationDate: String,
    gpa: String
  }],
  skills: [String],
  certifications: [String],
  projects: [{
    name: String,
    description: String,
    technologies: [String],
    url: String
  }],
  languages: [{
    language: String,
    proficiency: String
  }]
}
```

### Document Template Schema

```javascript
{
  id: String,
  name: String,
  description: String,
  schema: {
    sections: [String],
    maxLength: Object,
    formatting: {
      fontFamily: String,
      fontSize: Number,
      lineHeight: Number,
      margins: Object
    }
  },
  preview: String,
  isActive: Boolean
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3004 |
| `JWT_SECRET` | JWT verification secret | Required |
| `MAX_FILE_SIZE` | Max upload file size (MB) | 10 |
| `MAX_RESUME_SIZE` | Max resume data size (MB) | 5 |
| `TEMP_DIR` | Temporary file directory | /tmp/documents |
| `CLAMAV_HOST` | ClamAV scanner host | localhost |
| `RATE_LIMIT_GENERATE` | Generation rate limit per hour | 50 |
| `RATE_LIMIT_IMPORT` | Import rate limit per hour | 10 |

## Dependencies

- `express`: Web framework
- `multer`: File upload handling
- `docx`: DOCX document generation
- `mammoth`: DOCX parsing
- `clamav.js`: Virus scanning
- `joi`: Input validation
- `winston`: Structured logging
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting
- `prometheus-api-metrics`: Metrics collection
- `archiver`: ZIP file creation

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
docker build -t document-generation-service .
docker run -p 3004:3004 \
  -e JWT_SECRET=your-jwt-secret \
  -v /tmp/documents:/tmp/documents \
  document-generation-service
```

## Error Handling

Standardized error format:

```json
{
  "success": false,
  "error": "Document generation failed due to invalid resume data",
  "code": "GENERATION_FAILED",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "document-generation"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INVALID_FILE_TYPE` | 400 | Unsupported file format |
| `FILE_TOO_LARGE` | 413 | File exceeds size limits |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `GENERATION_FAILED` | 422 | Document generation failed |
| `PARSING_FAILED` | 422 | Document parsing failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Performance Optimization

### Document Generation

- **Streaming Generation:** Large documents generated in chunks
- **Template Caching:** Pre-compiled document templates
- **Memory Management:** Efficient memory usage for large documents
- **Parallel Processing:** Batch operations processed concurrently

### File Processing

- **Lazy Loading:** Files processed on-demand
- **Temporary Cleanup:** Automatic cleanup of temporary files
- **Stream Processing:** Large files processed without full loading
- **Resource Limits:** CPU and memory limits per operation

### Caching Strategy

- **Template Cache:** Redis caching for template configurations
- **Validation Cache:** Cache validation results
- **Metadata Cache:** Cache document metadata

## Monitoring & Observability

### Health Checks

- **File System Health:** Available disk space monitoring
- **Virus Scanner Health:** ClamAV connectivity checks
- **Memory Usage:** Heap and temporary file monitoring
- **Queue Health:** Processing queue status

### Metrics

- **Generation Metrics:** Success rates, generation times, template usage
- **Import Metrics:** Parsing success rates, file sizes, processing times
- **Error Metrics:** Error rates by type and endpoint
- **Resource Metrics:** Memory usage, disk space, CPU utilization

### Logging

- **Structured Logs:** JSON format with correlation IDs
- **Security Events:** File upload and processing events
- **Performance Logs:** Operation timing and resource usage
- **Error Logs:** Detailed error information with context

## Compliance

### Data Privacy

- **No Data Retention:** Documents not stored after generation
- **Temporary Processing:** All processing in temporary storage
- **Data Sanitization:** Personal data removed from logs
- **GDPR Compliance:** Data processing transparency

### Security Standards

- **File Security:** Virus scanning and type validation
- **Content Security:** XSS prevention and sanitization
- **Access Control:** User-based file access restrictions
- **Audit Trails:** Comprehensive operation logging

### Ethical Considerations

- **Fairness:** Document generation available to all users equally
- **Accessibility:** Support for screen readers and accessibility tools
- **Transparency:** Clear formatting guidelines and limitations
- **User Control:** Users retain full control over their documents

## Inter-Service Communication

### Synchronous Calls

```javascript
// Validate user before document generation
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
- `document.generated`
- `document.imported`
- `document.generation.failed`

### Circuit Breaker Pattern

```javascript
// Circuit breaker for external services
const generationBreaker = new CircuitBreaker(async (resumeData) => {
  return await generateDocument(resumeData);
}, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000
});
```

## Testing

### Unit Tests

```javascript
describe('Document Generation', () => {
  test('should generate ATS-safe DOCX', async () => {
    const resumeData = createMockResumeData();
    const result = await generateDocument(resumeData, 'ats-safe');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

- **File Processing Tests:** Upload, scan, and process files
- **Document Generation Tests:** End-to-end document creation
- **Template Tests:** Template loading and application
- **Security Tests:** File type validation and virus scanning

### Performance Tests

- **Load Testing:** High-concurrency document generation
- **Memory Testing:** Large document processing limits
- **File Size Testing:** Maximum file size handling

## Deployment

### Kubernetes Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: document-generation
spec:
  replicas: 2
  selector:
    matchLabels:
      app: document-generation
  template:
    metadata:
      labels:
        app: document-generation
    spec:
      containers:
      - name: document-generation
        image: careerverve/document-generation:v1.0.0
        ports:
        - containerPort: 3004
        volumeMounts:
        - name: temp-storage
          mountPath: /tmp/documents
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
      volumes:
      - name: temp-storage
        emptyDir: {}
```

### Scaling Strategy

- **Horizontal Scaling:** Stateless design supports multiple replicas
- **Resource Limits:** Memory and CPU limits per pod
- **Load Balancing:** Kubernetes service load distribution
- **Auto Scaling:** HPA based on CPU and request rate

## Support

For issues and questions:

- **Documentation:** [Central API Reference](../docs/api-reference.md)
- **Issues:** GitHub Issues
- **Support:** api-support@careerverve.com
- **Status:** https://status.careerverve.com

---

*Version: 1.0.0 | Last Updated: 2024-01-15*