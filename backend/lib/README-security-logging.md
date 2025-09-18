# Security Event Logging System

## Overview

The Security Event Logging System provides comprehensive security monitoring and logging capabilities for the profilebuilder project. It integrates with the existing Winston-based logging infrastructure and adds specialized security event tracking with database persistence, severity levels, correlation IDs, and automated alerting.

## Architecture

### Components

1. **SecurityLogger Class** (`securityLogger.ts`)
   - Extends the base Logger class with security-specific methods
   - Handles structured security event logging
   - Integrates with AlertChecker for automated alerting

2. **SecurityEvent Model** (`../models/SecurityEvent.ts`)
   - MongoDB schema for persistent security event storage
   - Automatic encryption of sensitive data (IP addresses, user agents, location)
   - Immutable design with append-only operations

3. **AlertChecker Class**
   - Analyzes security events for alert conditions
   - Implements threshold-based alerting logic
   - Prevents alert fatigue through intelligent filtering

4. **Security Constants** (`constants.ts`)
   - Centralized security event types, severity levels, and thresholds
   - Ensures consistency across the application

## Security Event Types

The system supports the following security event types:

- **AUTH_FAILURE**: Authentication failures and login attempts
- **RATE_LIMIT_VIOLATION**: Rate limiting violations
- **INPUT_VALIDATION_FAILURE**: Input validation errors
- **AI_SECURITY_EVENT**: AI-specific security events (prompt injection, etc.)
- **PRIVACY_COMPLIANCE_ACTION**: Privacy regulation compliance actions
- **SUSPICIOUS_ACTIVITY**: General suspicious user activities
- **ACCESS_DENIED**: Authorization failures
- **SESSION_ANOMALY**: Session-related security issues
- **ENCRYPTION_ERROR**: Encryption/decryption failures
- **INTEGRITY_CHECK_FAILURE**: Data integrity validation failures

## Severity Levels

Events are categorized by severity:

- **LOW**: Minor security events requiring monitoring
- **MEDIUM**: Moderate security concerns requiring attention
- **HIGH**: Significant security threats requiring immediate action
- **CRITICAL**: Severe security incidents requiring urgent response

## Alert Thresholds

The system includes configurable alert thresholds:

- Authentication failures: 5 per minute
- Rate limit violations: 10 per hour
- Input validation failures: 20 per minute
- Suspicious activities: 3 per hour

## Usage

### Basic Usage

```typescript
import { securityLogger } from '../lib/securityLogger';

// Log authentication failure
await securityLogger.logAuthFailure({
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  details: {
    failureReason: 'Invalid password',
    attemptedUsername: 'john.doe@example.com'
  }
});

// Log rate limit violation
await securityLogger.logRateLimitViolation({
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  details: {
    endpoint: '/api/resumes',
    limitType: 'requests_per_minute',
    requestCount: 150
  }
});

// Log AI security event
await securityLogger.logAISecurityEvent({
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  details: {
    aiAction: 'text_generation',
    securityRisk: 'prompt_injection',
    confidence: 0.95
  }
});
```

### Integration with Existing Code

The security logger integrates seamlessly with existing request handling:

```typescript
import { securityLogger } from '../lib/securityLogger';

// In authentication middleware
try {
  // Authentication logic
} catch (error) {
  await securityLogger.logAuthFailure({
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    details: { failureReason: error.message }
  });
  throw error;
}

// In rate limiting middleware
if (isRateLimited) {
  await securityLogger.logRateLimitViolation({
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    details: { endpoint: req.path, limitType: 'requests_per_hour' }
  });
}
```

## Data Encryption

Sensitive security event data is automatically encrypted before database storage:

- IP addresses
- User agent strings
- Geographic location data

Encryption uses AES-256 with a key stored in the `ENCRYPTION_KEY` environment variable.

## Database Schema

Security events are stored in a MongoDB collection with the following structure:

```javascript
{
  userId: ObjectId,           // Optional: Reference to user
  eventType: String,          // Security event type
  severity: String,           // Event severity level
  correlationId: String,      // Request correlation ID
  timestamp: Date,            // Event timestamp
  ipAddress: String,          // Encrypted IP address
  userAgent: String,          // Encrypted user agent
  location: String,           // Optional: Encrypted location
  details: Object,            // Event-specific details
  metadata: Object,           // Additional metadata
  alertTriggered: Boolean     // Whether alert was triggered
}
```

## Alerting

The system includes intelligent alerting capabilities:

- **Threshold-based alerts**: Automatic alerts when event frequencies exceed thresholds
- **Severity-based alerts**: Critical and high-severity events always trigger alerts
- **AI security alerts**: All AI security events trigger alerts due to their critical nature

Alerts are logged to both the security event database and the Winston logging system.

## Monitoring and Analytics

Security events can be monitored through:

1. **Database queries**: Direct MongoDB queries for historical analysis
2. **Winston logs**: Real-time log monitoring
3. **Metrics integration**: Compatible with Prometheus/Grafana for dashboards

## Configuration

Configure the system using environment variables:

```bash
ENCRYPTION_KEY=your-256-bit-encryption-key-here
LOG_LEVEL=info  # Winston log level
```

## Security Considerations

- **Data encryption**: Sensitive data is encrypted at rest
- **Immutability**: Security events cannot be modified or deleted
- **Correlation IDs**: All events include correlation IDs for request tracing
- **Access control**: Security logging operations should be restricted to authorized personnel
- **Audit trail**: All security events are permanently logged for compliance

## Performance

The security logging system is designed for minimal performance impact:

- Asynchronous logging operations
- Efficient database indexing
- Threshold-based alert checking to prevent overload
- Graceful failure handling (continues operation if logging fails)

## Compliance

The system supports compliance requirements for:

- GDPR Article 33 (Data breach notification)
- Security incident logging and reporting
- Audit trail requirements
- Data protection impact assessments

## Future Enhancements

Potential future improvements:

- Integration with SIEM systems
- Machine learning-based anomaly detection
- Automated incident response workflows
- Real-time alerting via email/SMS/webhooks
- Security event correlation and pattern analysis