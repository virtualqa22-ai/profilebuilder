# File Upload Service

A microservice for secure file upload, storage, and management in the CareerVerve platform.

## Overview

The File Upload Service handles:
- Secure file uploads with virus scanning
- File type validation and size limits
- Temporary and permanent file storage
- Image processing and optimization
- File access control and permissions
- CDN integration for file delivery

## Architecture

- **Framework:** Node.js with Express.js
- **File Processing:** Multer for uploads, Sharp for image processing
- **Security:** ClamAV virus scanning, file type validation
- **Storage:** Local file system with CDN integration
- **Observability:** Health checks, metrics, and structured logging

## API Endpoints

**Base URL:** `http://file-upload-service:3005/api/v1`

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Service-to-service calls use API keys:
```
X-API-Key: <service_api_key>
```

### File Upload API

#### POST /api/v1/upload

Upload a file with security scanning and processing.

**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload (required)
- `userId`: User identifier (required)
- `type`: File type category - 'resume', 'profile', 'document' (optional)
- `metadata`: JSON string with additional metadata (optional)

**Supported File Types:**
- **Documents:** PDF, DOC, DOCX (max 10MB)
- **Images:** JPEG, PNG, GIF, WebP (max 5MB)
- **Archives:** ZIP (max 50MB, for batch uploads)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file-12345",
    "filename": "resume.pdf",
    "originalName": "John_Doe_Resume.pdf",
    "url": "/uploads/1705312200000-resume.pdf",
    "cdnUrl": "https://cdn.careerverve.com/uploads/1705312200000-resume.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "type": "resume",
    "uploadedAt": "2024-01-15T10:00:00.000Z",
    "userId": "user123",
    "metadata": {
      "checksum": "sha256:...",
      "dimensions": null,
      "pages": 2
    }
  }
}
```

**Processing Steps:**
1. Validate authentication and permissions
2. Check file size and type limits
3. Generate unique filename with timestamp
4. Virus scan the uploaded file
5. Process file (resize images, extract metadata)
6. Store file securely
7. Generate CDN URLs
8. Return file information

**Error Responses:**
- `400 Bad Request`: Invalid file type or missing required fields
- `401 Unauthorized`: Invalid authentication
- `413 Payload Too Large`: File exceeds size limits
- `422 Unprocessable Entity`: Virus detected or processing failed
- `429 Too Many Requests`: Rate limit exceeded

**Rate Limit:** 20 uploads/hour per user

#### POST /api/v1/upload/batch

Upload multiple files in a single request.

**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Form Data:**
- `files`: Multiple files (max 10 files)
- `userId`: User identifier
- `type`: File type category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploaded": [
      {
        "id": "file-12345",
        "filename": "resume1.pdf",
        "url": "/uploads/1705312200000-resume1.pdf",
        "size": 1024000
      },
      {
        "id": "file-12346",
        "filename": "resume2.pdf",
        "url": "/uploads/1705312200001-resume2.pdf",
        "size": 890000
      }
    ],
    "failed": [],
    "totalSize": 1914000,
    "processingTime": 2.3
  }
}
```

### File Management API

#### GET /api/v1/upload/{id}

Retrieve file information and metadata.

**Authentication:** Required (JWT - file owner or admin)

**Parameters:**
- `id`: File ID

**Response (200):**
```json
{
  "id": "file-12345",
  "filename": "resume.pdf",
  "url": "/uploads/1705312200000-resume.pdf",
  "cdnUrl": "https://cdn.careerverve.com/uploads/1705312200000-resume.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "type": "resume",
  "uploadedAt": "2024-01-15T10:00:00.000Z",
  "userId": "user123",
  "downloadCount": 5,
  "lastAccessed": "2024-01-15T12:00:00.000Z",
  "metadata": {
    "checksum": "sha256:...",
    "dimensions": null,
    "pages": 2,
    "virusScanned": true
  }
}
```

#### GET /api/v1/upload/user/{userId}

List all files uploaded by a user.

**Authentication:** Required (JWT - user owns files or admin)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by file type
- `sortBy`: Sort field (default: uploadedAt)
- `sortOrder`: Sort order 'asc' or 'desc'

**Response (200):**
```json
{
  "files": [
    {
      "id": "file-12345",
      "filename": "resume.pdf",
      "url": "/uploads/1705312200000-resume.pdf",
      "size": 1024000,
      "type": "resume",
      "uploadedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalFiles": 45,
    "totalSize": 125000000,
    "types": {
      "resume": 30,
      "profile": 10,
      "document": 5
    }
  }
}
```

#### DELETE /api/v1/upload/{id}

Delete a file.

**Authentication:** Required (JWT - file owner or admin)

**Response (200):**
```json
{
  "message": "File deleted successfully",
  "id": "file-12345"
}
```

**Process:**
1. Validate ownership
2. Mark file as deleted (soft delete)
3. Remove from CDN if applicable
4. Queue physical file deletion
5. Update user quota

### File Access API

#### GET /api/v1/upload/{id}/download

Download a file.

**Authentication:** Required (JWT - file owner or authorized)

**Response:** Binary file data with appropriate Content-Type headers

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume.pdf"
X-File-Checksum: sha256:...
```

#### GET /api/v1/upload/{id}/preview

Get file preview/thumbnail for images.

**Authentication:** Required (JWT - file owner or authorized)

**Query Parameters:**
- `size`: Preview size - 'small', 'medium', 'large' (default: medium)
- `quality`: JPEG quality 1-100 (default: 80)

**Response:** JPEG image data

### Image Processing API

#### POST /api/v1/upload/{id}/process

Process an uploaded image.

**Authentication:** Required (JWT - file owner)

**Request Body:**
```json
{
  "operations": [
    {
      "type": "resize",
      "width": 800,
      "height": 600,
      "fit": "cover"
    },
    {
      "type": "crop",
      "x": 100,
      "y": 100,
      "width": 400,
      "height": 300
    },
    {
      "type": "filter",
      "name": "grayscale"
    }
  ]
}
```

**Supported Operations:**
- `resize`: Change image dimensions
- `crop`: Crop image to rectangle
- `rotate`: Rotate image
- `filter`: Apply filters (grayscale, blur, sharpen)
- `watermark`: Add watermark text/image
- `optimize`: Compress and optimize

**Response (200):**
```json
{
  "success": true,
  "processedUrl": "/uploads/processed/1705312200000-resume-processed.jpg",
  "originalSize": 2048000,
  "processedSize": 512000,
  "dimensions": {
    "width": 800,
    "height": 600
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
  "service": "file-upload",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "fileSystem": {
      "status": "healthy",
      "freeSpace": "50GB",
      "totalSpace": "100GB"
    },
    "virusScanner": {
      "status": "healthy",
      "lastScan": "2024-01-15T10:25:00.000Z"
    },
    "cdn": {
      "status": "healthy",
      "responseTime": 150
    }
  }
}
```

#### GET /api/v1/metrics

Prometheus-compatible metrics.

**Response (200):**
```
# HELP file_uploads_total Total file uploads
# TYPE file_uploads_total counter
file_uploads_total{type="resume",status="success"} 1250
file_uploads_total{type="profile",status="success"} 890

# HELP file_upload_duration_seconds File upload processing duration
# TYPE file_upload_duration_seconds histogram
file_upload_duration_seconds_bucket{le="1.0"} 1800
file_upload_duration_seconds_bucket{le="5.0"} 320
file_upload_duration_seconds_bucket{le="10.0"} 20

# HELP file_storage_bytes Total file storage used
# TYPE file_storage_bytes gauge
file_storage_bytes 10737418240
```

## Security

### File Security

- **Virus Scanning:** ClamAV integration for all uploads
- **File Type Validation:** Magic number checking, not just extensions
- **Content Analysis:** Malicious content detection
- **Size Limits:** Strict file size enforcement

### Access Control

- **User Isolation:** Files accessible only by owners
- **Permission Levels:** Owner, shared, public access
- **Audit Logging:** All file operations logged
- **Rate Limiting:** Per-user upload limits

### Data Protection

- **Secure Storage:** Files stored with restricted permissions
- **Encryption:** File encryption at rest
- **CDN Security:** Signed URLs for private files
- **Cleanup:** Automatic deletion of temporary files

## Data Models

### File Record Schema

```javascript
{
  id: String,           // Unique file identifier
  filename: String,     // Generated filename
  originalName: String, // Original uploaded filename
  url: String,          // Internal access URL
  cdnUrl: String,       // CDN access URL
  size: Number,         // File size in bytes
  mimeType: String,     // MIME type
  type: String,         // File category
  userId: String,       // Owner user ID
  uploadedAt: Date,     // Upload timestamp
  checksum: String,     // SHA-256 checksum
  metadata: {           // File-specific metadata
    dimensions: {       // For images
      width: Number,
      height: Number
    },
    pages: Number,      // For PDFs
    duration: Number,   // For videos
    virusScanned: Boolean
  },
  permissions: {        // Access permissions
    public: Boolean,
    sharedWith: [String] // User IDs
  },
  downloadCount: Number,
  lastAccessed: Date,
  deletedAt: Date       // Soft delete timestamp
}
```

### Upload Session Schema

```javascript
{
  sessionId: String,
  userId: String,
  files: [{
    id: String,
    status: String,     // 'uploading', 'processing', 'completed', 'failed'
    error: String
  }],
  startedAt: Date,
  completedAt: Date,
  totalSize: Number
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3005 |
| `JWT_SECRET` | JWT verification secret | Required |
| `UPLOAD_DIR` | File storage directory | /uploads |
| `MAX_FILE_SIZE` | Max file size (MB) | 10 |
| `MAX_FILES_PER_REQUEST` | Max files in batch upload | 10 |
| `ALLOWED_TYPES` | Comma-separated allowed MIME types | image/*,application/pdf |
| `CLAMAV_HOST` | ClamAV scanner host | localhost |
| `CDN_BASE_URL` | CDN base URL | https://cdn.careerverve.com |
| `RATE_LIMIT_UPLOADS` | Upload rate limit per hour | 20 |

## Dependencies

- `express`: Web framework
- `multer`: File upload handling
- `sharp`: Image processing
- `clamav.js`: Virus scanning
- `mime-types`: MIME type validation
- `crypto`: File checksums
- `fs-extra`: File system operations
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
docker build -t file-upload-service .
docker run -p 3005:3005 \
  -e JWT_SECRET=your-jwt-secret \
  -v /local/uploads:/uploads \
  file-upload-service
```

## Error Handling

Standardized error format:

```json
{
  "success": false,
  "error": "File contains virus and cannot be uploaded",
  "code": "VIRUS_DETECTED",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "file-upload"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INVALID_FILE_TYPE` | 400 | Unsupported file format |
| `FILE_TOO_LARGE` | 413 | File exceeds size limits |
| `VIRUS_DETECTED` | 422 | File contains virus |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | File not found |
| `STORAGE_ERROR` | 500 | File storage failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Performance Optimization

### File Processing

- **Streaming Uploads:** Large files processed in chunks
- **Async Processing:** Non-blocking file operations
- **Memory Limits:** Prevent memory exhaustion
- **Cleanup Jobs:** Automatic temporary file cleanup

### Storage Optimization

- **File Deduplication:** Checksum-based duplicate detection
- **Compression:** Automatic compression for large files
- **CDN Integration:** Global file distribution
- **Caching:** Metadata and small file caching

### Database Optimization

```javascript
// Optimized indexes
fileSchema.index({ userId: 1, uploadedAt: -1 });
fileSchema.index({ type: 1, uploadedAt: -1 });
fileSchema.index({ checksum: 1 }); // For deduplication
fileSchema.index({ deletedAt: 1 }); // For cleanup
```

## Monitoring & Observability

### Health Checks

- **Storage Health:** Disk space and file system checks
- **Virus Scanner Health:** ClamAV connectivity
- **CDN Health:** Content delivery network status
- **Queue Health:** Upload processing queues

### Metrics

- **Upload Metrics:** Success rates, file sizes, processing times
- **Storage Metrics:** Disk usage, file counts, cleanup stats
- **Security Metrics:** Virus detections, blocked uploads
- **Performance Metrics:** Response times, throughput

### Logging

- **Access Logs:** File upload and download events
- **Security Logs:** Virus detections and blocked uploads
- **Performance Logs:** Upload processing times
- **Error Logs:** Detailed error context and stack traces

## Compliance

### Data Privacy

- **File Ownership:** Users control their uploaded files
- **Deletion Rights:** Complete file deletion on request
- **Access Logging:** Comprehensive audit trails
- **Data Minimization:** Only necessary metadata stored

### Security Standards

- **File Security:** Virus scanning and type validation
- **Access Control:** User-based file permissions
- **Encryption:** Files encrypted at rest
- **Retention Policies:** Automatic file cleanup

### Ethical Considerations

- **Fair Access:** File upload available to all users
- **Content Moderation:** Harmful content detection
- **Transparency:** Clear file handling policies
- **User Consent:** File processing with user consent

## Inter-Service Communication

### Synchronous Calls

```javascript
// Validate user before file upload
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
- `file.uploaded`
- `file.processed`
- `file.deleted`
- `file.virus.detected`

### Circuit Breaker Pattern

```javascript
// Circuit breaker for CDN operations
const cdnBreaker = new CircuitBreaker(async (fileId) => {
  return await uploadToCDN(fileId);
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

## Testing

### Unit Tests

```javascript
describe('File Upload', () => {
  test('should upload and scan file successfully', async () => {
    const mockFile = createMockFile('test.pdf');
    const result = await uploadService.processUpload(mockFile, 'user123');

    expect(result.success).toBe(true);
    expect(result.data.url).toBeDefined();
    expect(result.data.checksum).toBeDefined();
  });
});
```

### Integration Tests

- **Upload Pipeline Tests:** Full upload, scan, and storage process
- **CDN Integration Tests:** File upload to CDN
- **Security Tests:** Virus scanning and file validation
- **Performance Tests:** Large file upload handling

### Load Tests

- **Concurrent Uploads:** Multiple users uploading simultaneously
- **Large File Tests:** Maximum file size processing
- **Batch Upload Tests:** Multiple file batch processing

## Deployment

### Kubernetes Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-upload
spec:
  replicas: 3
  selector:
    matchLabels:
      app: file-upload
  template:
    metadata:
      labels:
        app: file-upload
    spec:
      containers:
      - name: file-upload
        image: careerverve/file-upload:v1.0.0
        ports:
        - containerPort: 3005
        volumeMounts:
        - name: uploads-storage
          mountPath: /uploads
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
      volumes:
      - name: uploads-storage
        persistentVolumeClaim:
          claimName: uploads-pvc
```

### Storage Configuration

- **Persistent Volumes:** Kubernetes PVC for file storage
- **Backup Strategy:** Regular file system backups
- **Retention Policy:** Automatic cleanup of old files
- **Scaling:** Storage that scales with cluster

## Support

For issues and questions:

- **Documentation:** [Central API Reference](../docs/api-reference.md)
- **Issues:** GitHub Issues
- **Support:** api-support@careerverve.com
- **Status:** https://status.careerverve.com

---

*Version: 1.0.0 | Last Updated: 2024-01-15*