# Document Generation Service

A comprehensive microservice for generating various document formats including PDF, DOCX, and TXT files. The service provides template processing, data validation, security measures, and performance optimizations.

## Features

### Core Functionality
- **PDF Generation**: Create PDF documents from structured resume data using pdf-lib
- **Template Engine**: Load and apply document templates with placeholder replacement
- **Document Formatting**: Text styling, pagination, and consistent formatting rules
- **File Management**: Secure file operations with path validation and error handling

### Resilience & Performance
- **Retry Logic**: Exponential backoff for failed operations
- **Circuit Breaker Pattern**: Failure isolation and recovery
- **Metrics Tracking**: Performance monitoring and analytics
- **Concurrent Processing**: Handle multiple document generation requests simultaneously

### Security & Validation
- **Input Validation**: Comprehensive data validation with structured error messages
- **Path Security**: Directory traversal prevention and file extension validation
- **Data Sanitization**: Remove sensitive information and malicious content
- **Rate Limiting**: Prevent abuse with configurable request limits

### Observability
- **Structured Logging**: Winston-based logging with correlation IDs
- **Health Checks**: Service health monitoring endpoints
- **Performance Profiling**: Memory and execution time tracking

## Architecture

```
services/document-generation/
├── src/
│   ├── utils/
│   │   ├── constants.js          # Configuration and constants
│   │   ├── logger.js             # Winston logging utility
│   │   ├── validation.js         # Input validation functions
│   │   ├── error-handling.js     # Error handling and retry logic
│   │   ├── security.js           # Security utilities
│   │   └── performance.js        # Metrics and monitoring
│   ├── generators/
│   │   └── pdf-generator.js      # PDF generation using pdf-lib
│   ├── templates/
│   │   └── template-engine.js    # Template loading and processing
│   ├── formatters/
│   │   └── document-formatter.js # Text formatting and pagination
│   └── services/
│       └── document-service.js   # Main service orchestration
├── tests/
│   ├── document-generation.test.js
│   ├── setup.js
│   └── __mocks__/
│       └── pdf-lib.js
└── README.md
```

## API Endpoints

- `POST /api/document/generate` - Generate documents
- `GET /health` - Health check endpoint
- `GET /metrics` - Performance metrics endpoint

## Dependencies

- `pdf-lib`: PDF document generation
- `winston`: Structured logging
- `fs`: File system operations (Node.js built-in)

## Configuration

All configuration is managed through environment variables:

- `DOCUMENT_API_URL`: API endpoint URL
- `LOG_LEVEL`: Logging level (info, error, warn, debug)
- `MAX_TEXT_LENGTH`: Maximum text length for documents
- `MAX_FILE_SIZE`: Maximum file size in bytes

## Usage

```javascript
const { DocumentService } = require('./src/services/document-service');

const service = new DocumentService();

// Generate PDF from resume data
const pdfBuffer = await service.generateDocument({
  type: 'pdf',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    experience: ['Software Engineer at Company A']
  }
});

// Apply template
const template = await service.loadTemplate('modern');
const document = await service.applyTemplate(template, resumeData);

// Save document
const filePath = await service.saveDocument('resume.pdf', pdfBuffer);
```

## Error Handling

The service implements comprehensive error handling with standardized error codes:

- `VALIDATION_ERROR`: Input validation failures
- `TEMPLATE_ERROR`: Template processing errors
- `GENERATION_ERROR`: Document generation failures
- `FILE_ERROR`: File operation errors
- `SECURITY_ERROR`: Security violations
- `TIMEOUT_ERROR`: Operation timeouts

## Security Considerations

- Path traversal attacks are prevented through input sanitization
- File extensions are validated against allowed formats
- Sensitive data is automatically redacted from logs
- Rate limiting prevents abuse
- Input data is validated and sanitized before processing

## Performance Optimizations

- Concurrent document generation with Promise.all
- Memory-efficient file operations
- Configurable retry logic with exponential backoff
- Performance metrics tracking for optimization
- Circuit breaker pattern for external service calls

## Testing

Run tests with Jest:

```bash
cd services/document-generation
npm test
```

Tests cover:
- PDF generation from resume data
- Template loading and application
- Document formatting and pagination
- File operations and security
- Error handling and resilience
- Performance monitoring

## Monitoring

The service exposes metrics for:
- Document generation count
- Average generation time
- Error rates
- Memory usage
- Concurrent request handling

Metrics are compatible with Prometheus/Grafana monitoring stacks.

## Development Guidelines

- Follow test-driven development practices
- Maintain comprehensive test coverage (>80%)
- Use structured logging with correlation IDs
- Implement proper error handling and recovery
- Validate all inputs and sanitize outputs
- Document all public APIs and functions