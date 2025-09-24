# AI Service Module

## Overview

The AI Service module provides comprehensive AI-powered content processing capabilities for the CareerVerve platform. It integrates with OpenAI's GPT models to offer content rewriting, grammar/style suggestions, and content linting features while maintaining robust security, performance, and ethical standards.

## Features

- **Content Rewriting**: AI-powered content rewriting with optional style customization
- **Grammar & Style Suggestions**: Comprehensive analysis providing categorized improvement suggestions
- **Content Linting**: Detailed issue detection with severity scoring and line-by-line feedback
- **Security Integration**: Advanced prompt sanitization and output validation
- **Performance Optimization**: Intelligent caching and circuit breaker patterns
- **Rate Limiting**: User-based rate limiting to prevent abuse
- **Metrics & Monitoring**: Comprehensive performance tracking and health monitoring

## Architecture

### Core Components

#### AIService Class
The main service class that orchestrates all AI operations:

```typescript
class AIService {
  constructor(config: Partial<AIServiceConfig> = {})

  async rewriteContent(content: string, style?: string, userId?: string): Promise<string>
  async getSuggestions(content: string, userId?: string): Promise<SuggestionsResult>
  async detectLintIssues(content: string, language: string, userId?: string): Promise<LintResult>
  getHealthStatus(): HealthStatus
}
```

#### Circuit Breaker
Implements resilience patterns to handle AI service failures:

- **Failure Threshold**: 5 consecutive failures trigger circuit opening
- **Recovery Timeout**: 1 minute recovery period
- **Automatic Recovery**: Half-open state testing after timeout

#### Rate Limiter
Per-user rate limiting implementation:

- **Limit**: 10 requests per minute per user
- **Window**: 1-minute sliding window
- **Cleanup**: Automatic cleanup of expired entries every 5 minutes

### Integration Points

#### Security Module (`aiSecurity.ts`)
- **Prompt Sanitization**: `sanitizePrompt()` - Removes potentially harmful content
- **Content Validation**: `validateAIContent()` - Ensures output safety
- **Security Logging**: `logAISecurityEvent()` - Tracks security incidents

#### Caching Module (`cacheManager.ts`)
- **TTL-based Caching**: 1-hour cache for AI responses
- **Hash-based Keys**: Content hashing for efficient cache lookup
- **Performance Optimization**: Reduces API calls and response times

#### Metrics Module (`metrics.ts`)
- **Performance Tracking**: `trackAiMetrics()` - Response times and success rates
- **Usage Analytics**: `trackAIPerformance()` - Detailed performance metrics

#### Logging Module (`logger.ts`)
- **Structured Logging**: Comprehensive request/response logging
- **Error Tracking**: Detailed error information with context
- **Security Events**: Integration with security event logging

## Usage

### Basic Usage

```typescript
import { getAIService } from './aiService';

const aiService = getAIService();

// Content rewriting
const rewritten = await aiService.rewriteContent(
  "I have experience in software development",
  "professional",
  "user123"
);

// Grammar suggestions
const suggestions = await aiService.getSuggestions(
  "I got experience in software development",
  "user123"
);

// Content linting
const lintResult = await aiService.detectLintIssues(
  "I got experience in software development",
  "text",
  "user123"
);
```

### Advanced Configuration

```typescript
const customConfig = {
  openaiApiKey: process.env.CUSTOM_OPENAI_KEY,
  model: 'gpt-4',
  maxRetries: 5,
  timeout: 45000,
  cacheTTL: 7200 // 2 hours
};

const aiService = new AIService(customConfig);
```

## API Endpoints

The AI service is exposed through the following API endpoints:

### POST /api/v1/ai/rewrite
Content rewriting with optional style specification.

### POST /api/v1/ai/suggestions
Grammar, style, and general improvement suggestions.

### POST /api/v1/ai/lint
Content linting with issue detection and scoring.

See the main API reference documentation for detailed endpoint specifications.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `AI_MODEL` | `gpt-3.5-turbo` | AI model to use |
| `AI_MAX_RETRIES` | `3` | Maximum retry attempts |
| `AI_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `AI_CACHE_TTL` | `3600` | Cache TTL in seconds |

### Runtime Configuration

```typescript
interface AIServiceConfig {
  openaiApiKey: string;
  model: string;
  maxRetries: number;
  timeout: number;
  cacheTTL: number;
}
```

## Security Considerations

### Input Validation
- Content length limits (10,000 characters max)
- Type validation for all inputs
- Prompt sanitization before AI processing

### Output Validation
- Safety checks on AI-generated content
- Content filtering for inappropriate material
- Structured response validation

### Rate Limiting
- Per-user limits prevent abuse
- Automatic cleanup prevents memory leaks
- Security event logging for violations

### Authentication & Authorization
- User identification for rate limiting
- Session validation through NextAuth.js
- Audit logging for all AI interactions

## Performance Optimization

### Caching Strategy
- Content-based hashing for cache keys
- Configurable TTL (default: 1 hour)
- Cache hit ratio monitoring

### Circuit Breaker Pattern
- Automatic failure detection
- Graceful degradation during outages
- Recovery testing and automatic restoration

### Metrics Collection
- Response time tracking
- Success/failure rate monitoring
- Cache hit ratio analysis

## Error Handling

### Error Types

#### Validation Errors
- `Content is required and must be a string`
- `Content exceeds maximum length of 10,000 characters`

#### Security Errors
- `Content contains unsafe content and cannot be processed`
- `Generated content failed safety validation`

#### Rate Limiting
- `Rate limit exceeded. Please try again later.`

#### Service Errors
- `Circuit breaker is open`
- `Service temporarily unavailable. Please try again later.`

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Monitoring & Observability

### Health Checks
```typescript
const health = aiService.getHealthStatus();
// Returns: { circuitBreakerState: 'closed', cacheHealthy: true, rateLimiterActive: true }
```

### Metrics Integration
- Prometheus-compatible metrics
- Grafana dashboard integration
- Real-time performance monitoring

### Logging
- Structured logging with correlation IDs
- Security event tracking
- Performance metric logging

## Testing

### Unit Tests
- Comprehensive test coverage for all methods
- Mock implementations for external dependencies
- Error condition testing

### Integration Tests
- End-to-end API testing
- Rate limiting verification
- Caching behavior validation

### Contract Tests
- API contract validation
- Response schema verification
- Error handling confirmation

## Dependencies

### Core Dependencies
- **OpenAI API**: Primary AI processing engine
- **Cache Manager**: Performance optimization
- **Security Module**: Input/output validation
- **Metrics Module**: Performance tracking
- **Logger**: Structured logging

### Development Dependencies
- **Jest**: Testing framework
- **TypeScript**: Type safety
- **ESLint**: Code quality

## Ethical Considerations

### Privacy Protection
- **Data Minimization**: Only necessary data processed for operations
- **Temporary Processing**: Content not stored without explicit consent
- **User Control**: Clear opt-in/opt-out mechanisms
- **GDPR Compliance**: Adherence to data protection regulations

### Fairness & Bias
- **Bias Mitigation**: Regular audits for fair AI responses
- **Inclusive Design**: Consideration of diverse user backgrounds
- **Transparency**: Clear communication about AI capabilities and limitations
- **Human Oversight**: Critical decisions include human review

### Responsible AI Usage
- **Content Safety**: Prevention of harmful content generation
- **User Consent**: Explicit permission for AI processing
- **Error Boundaries**: Graceful handling of AI failures
- **Continuous Monitoring**: Ongoing evaluation of AI performance and ethics

### Security & Safety
- **Prompt Injection Protection**: Sanitization of all inputs
- **Output Validation**: Safety checks on all AI responses
- **Rate Limiting**: Prevention of abuse and resource exhaustion
- **Audit Logging**: Comprehensive tracking of AI interactions

## Deployment Considerations

### Environment Setup
1. Configure OpenAI API key in environment variables
2. Set appropriate model and performance parameters
3. Configure caching and monitoring integrations
4. Set up rate limiting parameters

### Scaling Considerations
- Horizontal scaling support through stateless design
- Shared caching layer for consistency
- Distributed rate limiting for multi-instance deployments
- Monitoring and alerting for performance issues

### Maintenance
- Regular model updates and performance tuning
- Security patch management
- Cache invalidation strategies
- Log rotation and retention policies

## Troubleshooting

### Common Issues

#### High Latency
- Check OpenAI API status
- Verify cache performance
- Monitor circuit breaker state

#### Rate Limiting Errors
- Verify user identification
- Check rate limiter configuration
- Review recent request patterns

#### Content Validation Failures
- Review input sanitization rules
- Check content length limits
- Verify safety validation logic

### Debug Mode
Enable detailed logging for troubleshooting:

```typescript
// Enable debug logging
process.env.AI_DEBUG = 'true';
```

## Future Enhancements

### Planned Features
- Multiple AI model support
- Custom prompt templates
- Advanced content analysis
- Real-time collaboration features

### Performance Improvements
- Response streaming
- Advanced caching strategies
- Model optimization
- Edge computing integration

### Security Enhancements
- Advanced threat detection
- Content classification
- Audit trail improvements
- Compliance automation