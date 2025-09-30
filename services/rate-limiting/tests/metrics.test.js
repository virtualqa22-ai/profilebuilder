// Unit tests for metrics utility

const { incrementCounter, observeHistogram, setGauge, getPrometheusMetrics, recordRequest } = require('../src/utils/metrics');

describe('Metrics', () => {
  test('should increment counter', () => {
    const before = getPrometheusMetrics();
    incrementCounter('rate_limiting_requests_total', 5);
    const after = getPrometheusMetrics();
    // Check that the counter increased
    const beforeMatch = before.match(/rate_limiting_requests_total (\d+)/);
    const afterMatch = after.match(/rate_limiting_requests_total (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) + 5);
  });

  test('should observe histogram', () => {
    const before = getPrometheusMetrics();
    observeHistogram('rate_limiting_request_duration_seconds', 0.5);
    const after = getPrometheusMetrics();
    // Check that count increased
    const beforeMatch = before.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    const afterMatch = after.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) + 1);
  });

  test('should set gauge', () => {
    setGauge('rate_limiting_circuit_breaker_state', 1);
    const metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_circuit_breaker_state 1');
  });

  test('should record request metrics', () => {
    const before = getPrometheusMetrics();
    recordRequest(true, 0.1);
    const after = getPrometheusMetrics();
    // Check that total requests increased
    const beforeMatch = before.match(/rate_limiting_requests_total (\d+)/);
    const afterMatch = after.match(/rate_limiting_requests_total (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) + 1);
  });

  test('should generate valid Prometheus format', () => {
    const metrics = getPrometheusMetrics();
    expect(metrics).toContain('# HELP');
    expect(metrics).toContain('# TYPE');
    expect(metrics).toMatch(/rate_limiting_[a-z_]+ \d+/g);
  });
});

// Additional tests for comprehensive coverage
describe('Metrics - Advanced Scenarios', () => {
  test('should handle incrementCounter with invalid metric name', () => {
    expect(() => incrementCounter('invalid_metric', 5)).not.toThrow();
  });

  test('should handle incrementCounter with zero value', () => {
    const before = getPrometheusMetrics();
    incrementCounter('rate_limiting_requests_total', 0);
    const after = getPrometheusMetrics();
    // Should not change
    const beforeMatch = before.match(/rate_limiting_requests_total (\d+)/);
    const afterMatch = after.match(/rate_limiting_requests_total (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]));
  });

  test('should handle incrementCounter with negative value', () => {
    const before = getPrometheusMetrics();
    incrementCounter('rate_limiting_requests_total', -1);
    const after = getPrometheusMetrics();
    // Should decrease
    const beforeMatch = before.match(/rate_limiting_requests_total (\d+)/);
    const afterMatch = after.match(/rate_limiting_requests_total (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) - 1);
  });

  test('should observe histogram with different bucket values', () => {
    const before = getPrometheusMetrics();
    // Test different latency values that fall into different buckets
    observeHistogram('rate_limiting_request_duration_seconds', 0.05); // < 0.1
    observeHistogram('rate_limiting_request_duration_seconds', 0.3);  // 0.1-0.5
    observeHistogram('rate_limiting_request_duration_seconds', 1.2);  // 0.5-1
    observeHistogram('rate_limiting_request_duration_seconds', 3.5);  // 1-2.5
    observeHistogram('rate_limiting_request_duration_seconds', 7.0);  // 2.5-5
    observeHistogram('rate_limiting_request_duration_seconds', 12.0); // >10 (Inf bucket)

    const after = getPrometheusMetrics();
    const beforeMatch = before.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    const afterMatch = after.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) + 6);
  });

  test('should handle observeHistogram with invalid metric name', () => {
    expect(() => observeHistogram('invalid_histogram', 1.0)).not.toThrow();
  });

  test('should handle setGauge with invalid metric name', () => {
    expect(() => setGauge('invalid_gauge', 42)).not.toThrow();
  });

  test('should update circuit breaker state metric', () => {
    setGauge('rate_limiting_circuit_breaker_state', 0); // closed
    let metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_circuit_breaker_state 0');

    setGauge('rate_limiting_circuit_breaker_state', 1); // open
    metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_circuit_breaker_state 1');

    setGauge('rate_limiting_circuit_breaker_state', 2); // half-open
    metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_circuit_breaker_state 2');
  });

  test('should update Redis connection status metric', () => {
    setGauge('rate_limiting_redis_connection_status', 1); // connected
    let metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_redis_connection_status 1');

    setGauge('rate_limiting_redis_connection_status', 0); // disconnected
    metrics = getPrometheusMetrics();
    expect(metrics).toContain('rate_limiting_redis_connection_status 0');
  });

  test('should record request metrics for allowed requests', () => {
    const before = getPrometheusMetrics();
    recordRequest(true, 0.25);
    const after = getPrometheusMetrics();

    // Check that allowed requests increased
    const beforeAllowed = before.match(/rate_limiting_requests_allowed_total (\d+)/);
    const afterAllowed = after.match(/rate_limiting_requests_allowed_total (\d+)/);
    expect(parseInt(afterAllowed[1])).toBe(parseInt(beforeAllowed[1]) + 1);
  });

  test('should record request metrics for blocked requests', () => {
    const before = getPrometheusMetrics();
    recordRequest(false, 0.15);
    const after = getPrometheusMetrics();

    // Check that blocked requests increased
    const beforeBlocked = before.match(/rate_limiting_requests_blocked_total (\d+)/);
    const afterBlocked = after.match(/rate_limiting_requests_blocked_total (\d+)/);
    expect(parseInt(afterBlocked[1])).toBe(parseInt(beforeBlocked[1]) + 1);
  });

  test('should handle histogram bucket edge cases', () => {
    const before = getPrometheusMetrics();
    // Test exact bucket boundaries
    observeHistogram('rate_limiting_request_duration_seconds', 0.1);  // Exactly 0.1
    observeHistogram('rate_limiting_request_duration_seconds', 0.5);  // Exactly 0.5
    observeHistogram('rate_limiting_request_duration_seconds', 1.0);  // Exactly 1.0
    observeHistogram('rate_limiting_request_duration_seconds', 2.5);  // Exactly 2.5
    observeHistogram('rate_limiting_request_duration_seconds', 5.0);  // Exactly 5.0
    observeHistogram('rate_limiting_request_duration_seconds', 10.0); // Exactly 10.0

    const after = getPrometheusMetrics();
    const beforeMatch = before.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    const afterMatch = after.match(/rate_limiting_request_duration_seconds_count (\d+)/);
    expect(parseInt(afterMatch[1])).toBe(parseInt(beforeMatch[1]) + 6);
  });

  test('should generate complete Prometheus output with all metric types', () => {
    // Add some data to all metric types
    incrementCounter('rate_limiting_requests_total', 10);
    incrementCounter('rate_limiting_requests_allowed_total', 8);
    incrementCounter('rate_limiting_requests_blocked_total', 2);
    observeHistogram('rate_limiting_request_duration_seconds', 0.5);
    setGauge('rate_limiting_circuit_breaker_state', 1);
    setGauge('rate_limiting_redis_connection_status', 1);

    const metrics = getPrometheusMetrics();

    // Check HELP comments
    expect(metrics).toContain('# HELP rate_limiting_requests_total Total number of requests');
    expect(metrics).toContain('# HELP rate_limiting_request_duration_seconds Request duration in seconds');
    expect(metrics).toContain('# HELP rate_limiting_circuit_breaker_state Circuit breaker state');

    // Check TYPE declarations
    expect(metrics).toContain('# TYPE rate_limiting_requests_total counter');
    expect(metrics).toContain('# TYPE rate_limiting_request_duration_seconds histogram');
    expect(metrics).toContain('# TYPE rate_limiting_circuit_breaker_state gauge');

    // Check that values are present (don't check exact values due to accumulation)
    expect(metrics).toMatch(/rate_limiting_requests_total \d+/);
    expect(metrics).toMatch(/rate_limiting_requests_allowed_total \d+/);
    expect(metrics).toMatch(/rate_limiting_requests_blocked_total \d+/);
    expect(metrics).toMatch(/rate_limiting_request_duration_seconds_count \d+/);
    expect(metrics).toMatch(/rate_limiting_circuit_breaker_state \d+/);
    expect(metrics).toMatch(/rate_limiting_redis_connection_status \d+/);
  });

  test('should handle empty histogram', () => {
    const metrics = getPrometheusMetrics();
    expect(metrics).toMatch(/rate_limiting_request_duration_seconds_count \d+/);
    expect(metrics).toMatch(/rate_limiting_request_duration_seconds_sum \d+(\.\d+)?/);
  });
});