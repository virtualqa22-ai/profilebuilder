# Actor System Module

## Overview

The Actor System implements a hierarchical supervisor-worker pattern with Agent-to-Agent (A2A) Model Context Protocol (MCP) for secure agent interoperability in the profilebuilder project. This module handles task delegation for resume building, AI processing, and document generation using agentic design patterns.

## Architecture

### Components

- **Supervisor**: Orchestrates task delegation and monitors worker health
- **Workers**: Specialized actors for specific tasks (AI rewrite, PDF generation)
- **MCP Protocol**: Secure message passing with signing and verification
- **Actor System**: Manages initialization and coordination of all actors

### Hierarchy

```
ActorSystem
├── Supervisor
│   ├── AiRewriteWorker
│   └── PdfGenerationWorker
```

## Key Features

### Resilience & Fault Tolerance
- Circuit breaker pattern for service protection
- Supervisor strategies: restart, escalate, ignore
- Automatic worker recovery and monitoring

### Security
- MCP message signing and verification
- Input validation and sanitization
- Secure inter-agent communication

### Observability
- Centralized logging with correlation IDs
- Health check endpoints
- Performance metrics tracking

## Usage

### Initialization

```typescript
import { initializeActorSystem } from './ActorSystem';

// Initialize the actor system
await initializeActorSystem();
```

### Task Delegation

```typescript
import { getActorService } from '../lib/actorService';

const actorService = getActorService();

// Delegate AI rewrite task
const result = await actorService.delegateAiRewrite('original text', {
  userId: 'user123',
  style: 'professional'
});

// Delegate PDF generation
const pdfResult = await actorService.delegatePdfGeneration(resumeData, {
  userId: 'user123'
});
```

## Configuration

Environment Variables:
- `MCP_SECRET_KEY`: Secret key for message signing (default: 'default-mcp-key-change-in-production')

Supervisor Configuration:
- `strategy`: Failure handling strategy ('restart' | 'escalate' | 'ignore')
- `circuitBreakerThreshold`: Number of failures before opening circuit

## Integration

The actor system integrates with existing backend services:

- **AIService**: Used by AiRewriteWorker for text processing
- **docxGenerator**: Used by PdfGenerationWorker for document creation
- **Logger**: Centralized logging across all actors
- **CircuitBreaker**: Resilience patterns from existing infrastructure

## Security Considerations

- All messages are signed and verified using HMAC-SHA256
- Input validation prevents injection attacks
- Sensitive data is sanitized before processing
- Rate limiting and circuit breakers prevent abuse

## Monitoring

Health status available via:
```typescript
const health = actorService.getHealthStatus();
// Returns: { initialized, supervisor: { workers, failures, circuitState }, registeredAgents }
```

## Error Handling

- Structured error objects with consistent codes
- Automatic retry with exponential backoff
- Supervisor escalation for critical failures
- Comprehensive logging for debugging

## Future Extensions

- Additional worker types (DOCX generation, email processing)
- Load balancing across multiple worker instances
- Distributed actor systems across multiple nodes
- Advanced routing and message queuing