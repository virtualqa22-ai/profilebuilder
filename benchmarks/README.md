# ProfileBuilder Performance Benchmarking Suite

This directory contains comprehensive performance benchmarking tools for the ProfileBuilder application, designed to ensure consistent performance, detect regressions, and validate SLAs.

## Overview

The benchmarking suite includes:
- **API Endpoint Benchmarks**: Measure response times, throughput, and error rates for all API endpoints
- **Database Benchmarks**: Test CRUD operations performance under various loads
- **Cache Benchmarks**: Evaluate caching system performance and hit rates
- **Load Testing**: Artillery-based scenarios for stress, spike, and endurance testing
- **CI/CD Integration**: Automated performance regression testing in pipelines

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or connection string
- Redis running locally or connection string
- Artillery CLI installed globally (optional, included in devDependencies)

### Environment Setup

Set the following environment variables:

```bash
export MONGODB_URI="mongodb://localhost:27017/profilebuilder_test"
export REDIS_URL="redis://localhost:6379"
export CACHE_REDIS_ENABLED="true"
export ENCRYPTION_KEY="test-encryption-key-for-benchmarks"
```

### Running Benchmarks

#### Individual Benchmarks

```bash
# API endpoint benchmarks
npm run test:performance:api

# Database operation benchmarks
npm run test:performance:db

# Cache performance benchmarks
npm run test:performance:cache

# All performance benchmarks
npm run test:performance
```

#### Load Testing

```bash
# Basic load test
npm run test:load

# Stress testing (finds breaking points)
npm run test:load:stress

# Spike testing (sudden traffic increases)
npm run test:load:spike

# Endurance testing (long-term stability)
npm run test:load:endurance

# Run all load tests
npm run test:load:all
```

## Benchmark Details

### API Benchmarks (`api-benchmark.js`)

Tests all major API endpoints with configurable concurrency levels:
- Health check endpoint
- Resume CRUD operations
- Locale and metrics endpoints

**Metrics collected:**
- Response times (P50, P95, P99)
- Throughput (requests/second)
- Error rates
- Success rates

### Database Benchmarks (`db-benchmark.js`)

Tests MongoDB operations with realistic data patterns:
- Create operations (resume insertion)
- Read operations (resume retrieval)
- Update operations (resume modifications)
- Delete operations (resume removal)

**Metrics collected:**
- Query execution times
- Throughput per operation type
- Connection pool utilization
- Error rates

### Cache Benchmarks (`cache-benchmark.js`)

Tests the multi-level caching system (Memory + Redis):
- Cache set operations
- Cache get operations
- Cache delete operations
- Hit/miss ratio analysis

**Metrics collected:**
- Cache operation latencies
- Hit/miss ratios
- Memory vs Redis performance
- Cache efficiency metrics

### Load Testing Scenarios

#### Load Test (`load-test.yml`)
- Steady load testing
- Gradual ramp-up to target concurrency
- Measures baseline performance

#### Stress Test (`stress-test.yml`)
- Extreme load conditions
- Finds system breaking points
- Tests failure recovery

#### Spike Test (`spike-test.yml`)
- Sudden traffic spikes
- Simulates viral events or flash sales
- Tests autoscaling capabilities

#### Endurance Test (`endurance-test.yml`)
- Long-duration testing (30+ minutes)
- Memory leak detection
- Sustained performance validation

## Performance SLAs

See [`performance-slas.md`](performance-slas.md) for detailed SLA definitions including:

- Response time targets per endpoint
- Error rate thresholds
- Availability requirements
- Resource utilization limits
- User journey completion times

## CI/CD Integration

Performance tests are automatically run in CI/CD pipelines:

### GitHub Actions Integration

The `performance-test` job in `.github/workflows/ci-cd.yml`:
- Runs on pull requests and main branch pushes
- Sets up MongoDB and Redis test instances
- Executes all benchmark suites
- Uploads results as artifacts
- Fails builds on critical performance regressions

### Regression Detection

- Compares current results against baseline metrics
- Alerts on significant performance degradation
- Stores historical performance data
- Generates performance trend reports

## Monitoring and Alerting

### Prometheus Alerts

Critical performance alerts are configured in `monitoring/prometheus/alerting_rules.yml`:

- **ResumeCreationSlow**: Resume creation > 3s P95
- **ResumeRetrievalSlow**: Resume retrieval > 1s P95
- **HealthCheckSlow**: Health check > 500ms P95
- **CacheHitRateLow**: Cache hit rate < 70%
- **DatabaseQuerySlow**: DB queries > 2s P95
- **APIEndpointHighErrorRate**: API errors > 5%
- **PerformanceRegression**: 20%+ latency increase

### Grafana Dashboard

Enhanced dashboard at `monitoring/grafana/dashboards/profilebuilder-dashboard.json` includes:

- Real-time performance metrics
- SLA compliance indicators
- System health scoring
- Performance trend analysis
- Alert status overview

## Results and Reporting

### Benchmark Results

Results are saved to `benchmarks/results/` with timestamps:
- `api-benchmark-{timestamp}.json`
- `db-benchmark-{timestamp}.json`
- `cache-benchmark-{timestamp}.json`

### Performance Reports

- **Console Output**: Real-time results during test execution
- **JSON Files**: Detailed metrics for analysis
- **Grafana**: Visual dashboards for monitoring
- **CI Artifacts**: Performance results attached to builds

## Configuration

### Benchmark Parameters

Modify these constants in benchmark files:

```javascript
// api-benchmark.js
const CONCURRENT_REQUESTS = [1, 10, 50, 100];
const TEST_DURATION = 30000; // 30 seconds
const WARMUP_REQUESTS = 10;

// db-benchmark.js
const CONCURRENT_OPERATIONS = [1, 5, 10, 25];
const TEST_DURATION = 30000;
const WARMUP_OPERATIONS = 50;
```

### Load Test Scenarios

Customize Artillery scenarios in YAML files:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10  # requests per second
      name: "Ramp up"
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check `MONGODB_URI` environment variable
   - Verify network connectivity

2. **Redis Connection Failed**
   - Ensure Redis is running on port 6379
   - Check `REDIS_URL` environment variable
   - Verify cache fallback to memory-only mode

3. **Artillery Tests Timeout**
   - Increase timeout values in YAML configs
   - Check application responsiveness
   - Verify sufficient system resources

4. **High Error Rates**
   - Check application logs for errors
   - Verify database and cache connectivity
   - Ensure sufficient system resources

### Performance Tuning

- **Database**: Ensure proper indexing
- **Cache**: Tune TTL values and memory limits
- **Application**: Optimize query patterns and connection pooling
- **Infrastructure**: Scale resources based on load test results

## Best Practices

### Running Benchmarks

1. **Environment Consistency**: Use identical environments for baseline and comparison tests
2. **Load Isolation**: Run benchmarks on dedicated infrastructure
3. **Data Cleanup**: Ensure test data doesn't affect production
4. **Metric Baselines**: Establish performance baselines after stabilization

### Interpreting Results

1. **Statistical Significance**: Run multiple iterations for reliable results
2. **Comparative Analysis**: Compare against historical baselines
3. **Root Cause Analysis**: Investigate performance regressions immediately
4. **Trend Monitoring**: Track performance over time, not just snapshots

## Contributing

### Adding New Benchmarks

1. Create benchmark script in `benchmarks/` directory
2. Follow existing naming conventions
3. Add npm script in `package.json`
4. Update CI/CD pipeline if needed
5. Document in this README

### Modifying SLAs

1. Update `performance-slas.md`
2. Adjust Prometheus alerts accordingly
3. Update Grafana dashboard thresholds
4. Communicate changes to team

## Support

For issues with benchmarking:

- Check application logs
- Review benchmark result files
- Verify environment configuration
- Consult performance SLAs

---

*This benchmarking suite ensures ProfileBuilder maintains high performance standards and quickly identifies any performance regressions.*