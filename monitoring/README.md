# ProfileBuilder Observability & Monitoring

This directory contains the monitoring and observability setup for the ProfileBuilder microservices application, implementing comprehensive monitoring using Prometheus, Grafana, and alerting systems across all services.

## Overview

The observability stack includes:
- **Health Checks**: `/health` endpoints for each microservice health monitoring
- **Metrics Collection**: Prometheus-compatible metrics at `/metrics` endpoints per service
- **Centralized Logging**: Winston-based logging with correlation IDs across services
- **Service Mesh Monitoring**: Istio telemetry and distributed tracing
- **Dashboards**: Grafana dashboards for visualization and alerting
- **Alerting**: Prometheus alerting rules for anomaly detection and incident response

## Components

### 1. Health Check Endpoints
- **Endpoints**: `GET /health` (per microservice)
- **Purpose**: Provides individual service health status including database connectivity and system metrics
- **Response**: JSON with status, uptime, memory usage, database health, and service dependencies
- **Kubernetes Integration**: Used for liveness and readiness probes

### 2. Metrics Endpoints
- **Endpoints**: `GET /metrics` (per microservice)
- **Purpose**: Exposes Prometheus-compatible metrics for each service
- **Metrics Include**:
  - HTTP request counts and durations by service
  - Database query metrics per service database
  - AI operation metrics (processing time, success rates)
  - Inter-service communication metrics
  - Memory and system metrics per pod
  - Error rates and circuit breaker status

### 3. Logging System
- **Library**: Winston with structured logging across all services
- **Features**:
  - Correlation IDs for distributed request tracing
  - Multiple log levels (error, warn, info, debug)
  - Centralized log aggregation via Fluentd
  - Structured JSON format with service identification
  - Log correlation across service boundaries

### 4. Service Mesh Monitoring (Istio)
- **Telemetry**: Automatic metrics collection for service mesh traffic
- **Distributed Tracing**: Jaeger integration for request tracing across services
- **Circuit Breaker Metrics**: Real-time status of resilience patterns
- **Load Balancing Metrics**: Traffic distribution and performance monitoring

### 5. Monitoring Stack
- **Prometheus**: Metrics collection and alerting with service discovery
- **Grafana**: Visualization and dashboards with multi-service views
- **AlertManager**: Alert routing and notifications with escalation
- **Jaeger**: Distributed tracing for complex request flows

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js application running on port 3000

### Starting the Monitoring Stack

1. Navigate to the monitoring directory:
   ```bash
   cd monitoring
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Access the services:
   - **Grafana**: http://localhost:3000 (admin/admin)
   - **Prometheus**: http://localhost:9090
   - **ProfileBuilder**: http://localhost:3000

### Configuration

#### Prometheus Configuration
- `prometheus.yml`: Main Prometheus configuration
- `alerting_rules.yml`: Alerting rules for anomaly detection

#### Grafana Configuration
- `grafana/provisioning/datasources/prometheus.yml`: Data source configuration
- `grafana/provisioning/dashboards/dashboard.yml`: Dashboard provisioning
- `grafana/dashboards/profilebuilder-dashboard.json`: Main dashboard

## Metrics Collected

### HTTP Metrics
- `http_requests_total`: Total HTTP requests by method, route, and status
- `http_request_duration_seconds`: Request duration histograms

### Database Metrics
- `db_queries_total`: Database query counts
- `db_query_duration_seconds`: Query duration histograms

### AI Metrics
- `ai_requests_total`: AI operation counts
- `ai_request_duration_seconds`: AI operation durations

### System Metrics
- `memory_usage_bytes`: Memory usage by type
- Default Node.js metrics (CPU, heap, etc.)

## Alerting Rules

The system includes alerting rules for:
- High error rates (>10% in 5 minutes)
- High latency (>5 seconds 95th percentile)
- High memory usage (>90%)
- Service downtime
- Database connection issues
- AI security threats

## Logging

### Log Levels
- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debugging information

### Correlation IDs
All logs include correlation IDs for request tracing across services.

### Log Files
- `logs/error.log`: Error-level logs
- `logs/all.log`: All log levels
- Console output for development

## Usage Examples

### Checking Health
```bash
curl http://localhost:3000/api/health
```

### Viewing Metrics
```bash
curl http://localhost:3000/api/metrics
```

### Accessing Dashboards
1. Open Grafana at http://localhost:3000
2. Login with admin/admin
3. Navigate to the ProfileBuilder dashboard

## Troubleshooting

### Common Issues

1. **Metrics not appearing in Prometheus**
   - Ensure the application is running on port 3000
   - Check Prometheus targets status
   - Verify metrics endpoint is accessible

2. **Grafana dashboard not loading**
   - Check Grafana provisioning configuration
   - Verify Prometheus data source is connected
   - Check dashboard JSON syntax

3. **Alerts not firing**
   - Verify alerting rules syntax
   - Check Prometheus rule evaluation
   - Ensure metrics are being collected

### Logs Location
- Application logs: `logs/` directory
- Docker logs: `docker-compose logs [service-name]`

## Security Considerations

- Health and metrics endpoints should be protected in production
- Log files may contain sensitive information
- Alert notifications should be secured
- Grafana admin password should be changed

## Performance Impact

The monitoring system has minimal performance impact:
- Metrics collection: <1ms per request
- Logging: Asynchronous with buffering
- Health checks: Lightweight database ping

## Maintenance

### Regular Tasks
- Monitor disk space for logs and metrics
- Review and update alerting thresholds
- Update Grafana dashboards as needed
- Rotate log files periodically

### Backup
- Grafana database (SQLite by default)
- Prometheus metrics data
- Log files (if needed for compliance)