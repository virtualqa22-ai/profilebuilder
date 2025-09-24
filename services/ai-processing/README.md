# AI Processing Service

An AI-powered microservice for content processing, rewriting, and intelligent suggestions in the CareerVerve platform. Implements an actor-based architecture for scalability and fault tolerance.

## Overview

The AI Processing Service provides:
- Content rewriting with style adaptation
- Grammar and style suggestions
- Content linting with severity scoring
- AI-powered resume optimization
- Actor-based request processing
- Circuit breaker pattern for resilience
- Comprehensive security and ethical AI usage

## Architecture

- **Framework:** C# with Akka.NET actor system
- **AI Integration:** OpenAI GPT models with fallbacks
- **Architecture:** Actor-based system with supervisor hierarchy
- **Security:** Input sanitization, prompt injection protection
- **Observability:** Health checks, metrics, and distributed tracing

## Actor System Design

### Actor Hierarchy

```
SupervisorActor
├── RouterActor (routes requests to worker pools)
│   ├── RewriteWorkerActor (pool of 10 actors)
│   ├── SuggestionWorkerActor (pool of 10 actors)
│   └── LintWorkerActor (pool of 10 actors)
├── MetricsActor (collects performance metrics)
├── HealthActor (provides health status)
└── CircuitBreakerActor (manages external service calls)
```

### Message Patterns

**Request-Response Pattern:**
```csharp
public class RewriteRequest
{
    public string Content { get; set; }
    public string Style { get; set; }
    public string UserId { get; set; }
    public string CorrelationId { get; set; }
}

public class RewriteResponse
{
    public bool Success { get; set; }
    public string RewrittenContent { get; set; }
    public double ProcessingTime { get; set; }
    public string Model { get; set; }
    public string CorrelationId { get; set; }
}
```

**Fire-and-Forget Pattern:**
```csharp
// Metrics collection
Context.System.EventStream.Subscribe(Self, typeof(MetricMessage));
```

## API Endpoints

**Base URL:** `http://ai-processing-service:3003/api/v1`

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Service-to-service calls use API keys:
```
X-API-Key: <service_api_key>
```

### AI Operations API

#### POST /api/v1/ai/rewrite

Rewrite content using AI with optional style specification.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "I have experience in software development and worked on many projects",
  "style": "professional",
  "userId": "user123",
  "correlationId": "req-12345"
}
```

**Validation Rules:**
- `content`: Required, max 10,000 characters
- `style`: Optional, enum: "professional", "casual", "formal", "concise"
- `userId`: Required for rate limiting
- `correlationId`: Optional, auto-generated if not provided

**Response (200):**
```json
{
  "success": true,
  "data": "I possess extensive experience in software development, having contributed to numerous projects",
  "processingTime": 1.5,
  "model": "gpt-4",
  "correlationId": "req-12345",
  "tokensUsed": 150
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input or content too long
- `401 Unauthorized`: Invalid authentication
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: AI service unavailable
- `503 Service Unavailable`: Circuit breaker open

**Rate Limit:** 10 requests/minute per user

**Actor Flow:**
1. `RouterActor` receives request
2. Routes to `RewriteWorkerActor` pool
3. Worker validates input and sanitizes content
4. Calls AI service with circuit breaker protection
5. Processes response and validates output
6. Returns result with metrics

#### POST /api/v1/ai/suggestions

Provide grammar, style, and improvement suggestions for content.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "I got experience in software development. Projects were worked on by me.",
  "userId": "user123",
  "correlationId": "req-12346"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "grammar": [
      "Consider using 'I have' instead of 'I got' for formal writing",
      "Use active voice: 'I worked on projects' instead of 'Projects were worked on by me'"
    ],
    "style": [
      "Vary sentence structure for better readability",
      "Use more specific examples to strengthen claims"
    ],
    "suggestions": [
      "Consider quantifying achievements with metrics",
      "Add action verbs to highlight accomplishments"
    ]
  },
  "correlationId": "req-12346",
  "score": 75
}
```

**Actor Flow:**
1. `RouterActor` routes to `SuggestionWorkerActor`
2. Worker performs multi-step analysis
3. Calls AI service for each analysis type
4. Aggregates results with confidence scoring
5. Returns categorized suggestions

#### POST /api/v1/ai/lint

Comprehensive content linting with error detection and severity scoring.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "content": "I got experience in software development. Projects were worked on by me.",
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
        "message": "Use 'I have' instead of 'I got' for formal writing",
        "line": 1,
        "column": 3,
        "severity": "warning",
        "suggestion": "I have"
      },
      {
        "type": "style",
        "message": "Passive voice detected",
        "line": 2,
        "column": 1,
        "severity": "info",
        "suggestion": "I worked on projects"
      }
    ],
    "score": 65,
    "grade": "C"
  },
  "correlationId": "req-12347"
}
```

**Severity Levels:**
- `error`: Critical issues requiring immediate attention
- `warning`: Important improvements recommended
- `info`: Optional enhancements

### Batch Operations API

#### POST /api/v1/ai/batch/rewrite

Process multiple rewrite requests in batch.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "requests": [
    {
      "content": "First content to rewrite",
      "style": "professional",
      "id": "item1"
    },
    {
      "content": "Second content to rewrite",
      "style": "concise",
      "id": "item2"
    }
  ],
  "userId": "user123",
  "correlationId": "batch-12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "id": "item1",
      "success": true,
      "data": "Rewritten first content...",
      "processingTime": 1.2
    },
    {
      "id": "item2",
      "success": true,
      "data": "Rewritten second content...",
      "processingTime": 1.8
    }
  ],
  "correlationId": "batch-12345",
  "totalProcessingTime": 3.0
}
```

### Health & Monitoring API

#### GET /api/v1/health

Service health check with actor system status.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "ai-processing",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "actors": {
    "supervisor": "alive",
    "router": "alive",
    "workers": {
      "rewrite": 10,
      "suggestion": 10,
      "lint": 10
    }
  },
  "circuitBreaker": {
    "state": "closed",
    "failures": 0
  },
  "aiService": {
    "status": "healthy",
    "responseTime": 850
  }
}
```

#### GET /api/v1/metrics

Prometheus-compatible metrics.

**Response (200):**
```
# HELP ai_requests_total Total AI processing requests
# TYPE ai_requests_total counter
ai_requests_total{operation="rewrite",status="success"} 1250
ai_requests_total{operation="suggestions",status="success"} 890

# HELP ai_processing_duration_seconds AI processing duration
# TYPE ai_processing_duration_seconds histogram
ai_processing_duration_seconds_bucket{operation="rewrite",le="1.0"} 1200
ai_processing_duration_seconds_bucket{operation="rewrite",le="2.0"} 45
ai_processing_duration_seconds_bucket{operation="rewrite",le="5.0"} 5

# HELP actor_messages_total Total actor messages processed
# TYPE actor_messages_total counter
actor_messages_total{actor_type="RewriteWorker",status="success"} 1250
```

## Security

### Input Security

- **Prompt Injection Protection:** Input sanitization and validation
- **Content Filtering:** Harmful content detection and blocking
- **Rate Limiting:** Per-user and global request limits
- **Input Size Limits:** Maximum content length enforcement

### AI Safety

- **Output Validation:** AI-generated content validation
- **Bias Mitigation:** Regular model audits and monitoring
- **Ethical Guidelines:** Fairness and non-discrimination checks
- **Content Moderation:** Inappropriate content filtering

### Authentication & Authorization

- **JWT Validation:** Token verification with user context
- **API Key Authentication:** Service-to-service security
- **Request Signing:** Optional request signing for high-security operations
- **Audit Logging:** All AI interactions logged with user context

## Actor System Implementation

### Supervisor Strategy

```csharp
public class AiSupervisorStrategy : SupervisorStrategy
{
    protected override Directive Decide(Exception cause)
    {
        return cause switch
        {
            AiServiceException => Directive.Restart,
            CircuitBreakerOpenException => Directive.Escalate,
            _ => Directive.Stop
        };
    }
}
```

### Circuit Breaker Pattern

```csharp
public class AiCircuitBreaker : CircuitBreaker
{
    public AiCircuitBreaker() : base(
        maxFailures: 5,
        callTimeout: TimeSpan.FromSeconds(30),
        resetTimeout: TimeSpan.FromMinutes(1))
    {
    }
}
```

### Worker Actor Implementation

```csharp
public class RewriteWorkerActor : ReceiveActor
{
    public RewriteWorkerActor()
    {
        Receive<RewriteRequest>(request => HandleRewrite(request));
    }

    private async Task HandleRewrite(RewriteRequest request)
    {
        try
        {
            // Validate input
            ValidateRequest(request);

            // Call AI service with circuit breaker
            var result = await _circuitBreaker.Call(() =>
                _aiService.RewriteAsync(request.Content, request.Style));

            // Validate output
            ValidateResponse(result);

            // Send response
            Sender.Tell(new RewriteResponse
            {
                Success = true,
                RewrittenContent = result.Content,
                ProcessingTime = result.ProcessingTime,
                CorrelationId = request.CorrelationId
            });
        }
        catch (Exception ex)
        {
            // Log error and send failure response
            _logger.Error(ex, "Rewrite failed for {CorrelationId}", request.CorrelationId);
            Sender.Tell(new RewriteResponse
            {
                Success = false,
                Error = ex.Message,
                CorrelationId = request.CorrelationId
            });
        }
    }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3003 |
| `JWT_SECRET` | JWT verification secret | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `AI_MODEL` | Default AI model | gpt-4 |
| `MAX_CONTENT_LENGTH` | Max content length | 10000 |
| `RATE_LIMIT_PER_USER` | Requests per minute per user | 10 |
| `CIRCUIT_BREAKER_MAX_FAILURES` | Circuit breaker threshold | 5 |
| `ACTOR_POOL_SIZE` | Worker actor pool size | 10 |

### Actor System Configuration

```hocon
akka {
  actor {
    supervisor-strategy = "CareerVerve.AI.AiSupervisorStrategy, CareerVerve.AI"
    default-dispatcher {
      type = ForkJoinDispatcher
      throughput = 100
    }
  }
  remote {
    dot-netty.tcp {
      port = 0
      hostname = localhost
    }
  }
}
```

## Dependencies

- `Akka.NET`: Actor system framework
- `Akka.Remote`: Distributed actor communication
- `OpenAI.NET`: OpenAI API client
- `Polly`: Circuit breaker and retry policies
- `Serilog`: Structured logging
- `Prometheus.Client`: Metrics collection
- `FluentValidation`: Input validation
- `Microsoft.AspNetCore`: Web API framework

## Development

### Running Locally

```bash
dotnet build
dotnet run
```

### Testing

```bash
dotnet test
dotnet test --collect:"XPlat Code Coverage"
```

### Docker

```bash
docker build -t ai-processing-service .
docker run -p 3003:3003 \
  -e OPENAI_API_KEY=your-api-key \
  -e JWT_SECRET=your-jwt-secret \
  ai-processing-service
```

## Error Handling

Standardized error format:

```json
{
  "success": false,
  "error": "Content contains unsafe content and cannot be processed",
  "code": "UNSAFE_CONTENT",
  "correlationId": "req-12345",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "ai-processing"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `UNSAFE_CONTENT` | 400 | Content flagged as unsafe |
| `AI_SERVICE_ERROR` | 502 | AI service error |
| `CIRCUIT_BREAKER_OPEN` | 503 | Service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Performance Optimization

### Actor Pool Sizing

- **Rewrite Workers:** 10 actors (CPU-intensive)
- **Suggestion Workers:** 10 actors (analysis-heavy)
- **Lint Workers:** 10 actors (multi-step processing)

### Caching Strategy

- **Response Caching:** Redis caching for similar requests
- **Model Responses:** Short-term caching to reduce API costs
- **Validation Results:** Cache input validation results

### Load Balancing

- **Round Robin:** Equal distribution across worker pools
- **Least Loaded:** Route to least busy actors
- **Adaptive:** Adjust pool sizes based on load

## Monitoring & Observability

### Health Checks

- **Actor System Health:** All actors responsive
- **AI Service Health:** API connectivity and response times
- **Circuit Breaker Status:** Open/closed state monitoring
- **Queue Depths:** Actor mailbox sizes

### Metrics

- **Request Metrics:** Success rates, response times, error rates
- **Actor Metrics:** Message processing times, mailbox sizes
- **AI Service Metrics:** Token usage, model performance
- **Circuit Breaker Metrics:** Failure counts, state changes

### Distributed Tracing

- **Correlation IDs:** Request tracing across services
- **Actor Tracing:** Message flow through actor system
- **External Calls:** AI service and database call tracing

## Compliance & Ethics

### AI Ethics

- **Transparency:** Clear disclosure of AI processing
- **User Consent:** Explicit opt-in for AI features
- **Bias Monitoring:** Regular audits for biased outputs
- **Data Minimization:** Only necessary data processed

### Data Privacy

- **No Data Retention:** AI processing data not stored
- **Anonymization:** User data anonymized for model training
- **GDPR Compliance:** Right to erasure and data portability
- **Content Moderation:** Harmful content detection

### Fairness & Accessibility

- **Non-Discriminatory:** AI responses fair across demographics
- **Accessibility:** Support for various content formats
- **Language Support:** Multi-language content processing
- **Cultural Sensitivity:** Culturally appropriate suggestions

## Inter-Service Communication

### Synchronous Calls

```csharp
// Validate user before processing
var userValidation = await _userService.ValidateUserAsync(request.UserId);
if (!userValidation.IsValid)
{
    throw new UnauthorizedAccessException("Invalid user");
}
```

### Event Publishing

Publishes events to message queue:
- `ai.request.processed`
- `ai.content.flagged`
- `ai.service.degraded`

### Circuit Breaker Integration

```csharp
var aiResponse = await _circuitBreaker.ExecuteAsync(async () =>
{
    return await _openAiService.RewriteAsync(content, style);
});
```

## Testing

### Unit Tests

```csharp
[Fact]
public async Task RewriteWorkerActor_ValidRequest_ReturnsSuccess()
{
    // Arrange
    var request = new RewriteRequest
    {
        Content = "Test content",
        Style = "professional",
        CorrelationId = "test-123"
    };

    // Act
    var response = await _actor.Ask<RewriteResponse>(request);

    // Assert
    Assert.True(response.Success);
    Assert.Equal("test-123", response.CorrelationId);
}
```

### Integration Tests

- **Actor System Tests:** Full actor hierarchy testing
- **AI Service Tests:** Mocked AI service integration
- **Circuit Breaker Tests:** Failure scenario testing
- **Load Tests:** Performance under high concurrency

### Contract Tests

- **API Contracts:** OpenAPI specification validation
- **Message Contracts:** Actor message schema validation
- **Event Contracts:** Published event schema validation

## Deployment

### Kubernetes Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-processing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-processing
  template:
    metadata:
      labels:
        app: ai-processing
    spec:
      containers:
      - name: ai-processing
        image: careerverve/ai-processing:v1.0.0
        ports:
        - containerPort: 3003
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Scaling Strategy

- **Horizontal Scaling:** Actor system supports clustering
- **Auto Scaling:** HPA based on CPU and custom metrics
- **Load Distribution:** Akka.Cluster for multi-node deployments
- **State Management:** Event sourcing for actor state

## Support

For issues and questions:

- **Documentation:** [Central API Reference](../docs/api-reference.md)
- **Issues:** GitHub Issues
- **Support:** api-support@careerverve.com
- **Status:** https://status.careerverve.com

---

*Version: 1.0.0 | Last Updated: 2024-01-15*