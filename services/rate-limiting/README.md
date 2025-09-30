# Rate Limiting Microservice

A dedicated microservice for rate limiting using Redis cluster with AOF persistence and fail-closed circuit breaker.

## Features

- **Rate Limiting**: Implements sliding window rate limiting per user and endpoint.
- **Redis Cluster Support**: Uses Redis cluster for scalable storage with AOF enabled.
- **Circuit Breaker**: Fail-closed circuit breaker blocks all requests when Redis is unavailable.
- **Comprehensive Logging**: Centralized logging with correlation IDs for request tracing.
- **Metrics**: Prometheus-compatible metrics for latency, throughput, and errors.
- **Health Checks**: Exposes health check endpoints for monitoring.
- **Environment Configuration**: All configuration via environment variables (12-factor app).

## API Endpoints

### POST /api/v1/rate-limit/check
Checks if a request is allowed based on rate limits.

**Request Body:**
```json
{
  "userId": "string",
  "endpoint": "string"
}
```

**Response:**
- 200: Allowed
- 429: Rate limit exceeded
- 503: Service unavailable (circuit breaker open)

### GET /api/v1/rate-limit/quota/{userId}/{endpoint}
Retrieves current quota information for a user and endpoint.

**Response:**
```json
{
  "userId": "string",
  "endpoint": "string",
  "requests": 100,
  "limit": 1000,
  "windowMs": 60000,
  "remaining": 900
}
```

### GET /health
Health check endpoint.

**Response:**
- 200: Healthy
- 503: Unhealthy

### GET /metrics
Prometheus metrics endpoint.

## Installation

1. Clone the repository.
2. Navigate to `services/rate-limiting/`.
3. Run `npm install`.

## Configuration

Set the following environment variables:

- `PORT`: Server port (default: 3000)
- `REDIS_HOSTS`: Comma-separated list of Redis cluster hosts (e.g., "redis1:6379,redis2:6379")
- `REDIS_PASSWORD`: Redis password (optional)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window (default: 1000)
- `CIRCUIT_BREAKER_TIMEOUT_MS`: Circuit breaker timeout (default: 5000)
- `CIRCUIT_BREAKER_FAILURE_THRESHOLD`: Failure threshold for circuit breaker (default: 5)
- `LOG_LEVEL`: Logging level (default: "info")

## Running the Service

```bash
npm start
```

For development:
```bash
npm run dev
```

## Dependencies

- **express**: Web framework
- **redis**: Redis client for cluster support

## Architecture

- **src/app.js**: Main application entry point with Express setup and Redis connection.
- **src/routes/**: API route handlers.
- **src/models/**: Data models for rate limiting.
- **src/utils/**: Utility modules for logging, metrics, and circuit breaker.
- **src/constants.js**: Centralized constants.

## Circuit Breaker

The service implements a fail-closed circuit breaker. When Redis is unavailable, all requests are blocked with 503 status to prevent cascading failures.

## Testing

Run tests with:
```bash
npm test
```

Tests cover unit tests for all modules with at least 80% coverage.

## Monitoring

- Health checks: `/health`
- Metrics: `/metrics` (Prometheus format)
- Logs: Structured JSON logs with correlation IDs

## Security

- Input validation on all endpoints.
- No hardcoded secrets; use environment variables.
- Least privilege access enforced.

## Scalability

- Redis cluster for horizontal scaling.
- Stateless service design.
- Kubernetes-ready with HPA support.