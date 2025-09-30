// Metrics collection utility for the rate limiting microservice
// Provides Prometheus-compatible metrics for monitoring and alerting
// Implements counters, histograms, and gauges for key service metrics

const { METRICS_NAMES } = require('../constants');

// In-memory metrics storage
const metrics = {
  counters: {},
  histograms: {},
  gauges: {},
};

/**
 * Initialize metrics storage
 */
function initializeMetrics() {
  // Initialize counters
  metrics.counters[METRICS_NAMES.REQUESTS_TOTAL] = 0;
  metrics.counters[METRICS_NAMES.REQUESTS_ALLOWED] = 0;
  metrics.counters[METRICS_NAMES.REQUESTS_BLOCKED] = 0;

  // Initialize histograms (buckets for request duration in seconds)
  metrics.histograms[METRICS_NAMES.REQUEST_DURATION] = {
    count: 0,
    sum: 0,
    buckets: {
      '0.1': 0,   // 100ms
      '0.5': 0,   // 500ms
      '1': 0,     // 1s
      '2.5': 0,   // 2.5s
      '5': 0,     // 5s
      '10': 0,    // 10s
      '+Inf': 0,  // >10s
    },
  };

  // Initialize gauges
  metrics.gauges[METRICS_NAMES.CIRCUIT_BREAKER_STATE] = 0; // 0=closed, 1=open, 2=half-open
  metrics.gauges[METRICS_NAMES.REDIS_CONNECTION_STATUS] = 0; // 0=disconnected, 1=connected
}

/**
 * Increment a counter metric
 * @param {string} name - Metric name
 * @param {number} value - Value to increment by (default: 1)
 * @param {object} labels - Prometheus labels (not used in simple implementation)
 */
function incrementCounter(name, value = 1, labels = {}) {
  if (metrics.counters[name] !== undefined) {
    metrics.counters[name] += value;
  }
}

/**
 * Observe a histogram metric
 * @param {string} name - Metric name
 * @param {number} value - Observed value
 * @param {object} labels - Prometheus labels (not used in simple implementation)
 */
function observeHistogram(name, value, labels = {}) {
  if (metrics.histograms[name]) {
    const histogram = metrics.histograms[name];
    histogram.count += 1;
    histogram.sum += value;

    // Update buckets
    const buckets = Object.keys(histogram.buckets).sort((a, b) => {
      if (a === '+Inf') return 1;
      if (b === '+Inf') return -1;
      return parseFloat(a) - parseFloat(b);
    });

    for (const bucket of buckets) {
      if (bucket === '+Inf') {
        histogram.buckets[bucket] += 1;
        break;
      }
      if (value <= parseFloat(bucket)) {
        histogram.buckets[bucket] += 1;
      }
    }
  }
}

/**
 * Set a gauge metric
 * @param {string} name - Metric name
 * @param {number} value - Gauge value
 * @param {object} labels - Prometheus labels (not used in simple implementation)
 */
function setGauge(name, value, labels = {}) {
  if (metrics.gauges[name] !== undefined) {
    metrics.gauges[name] = value;
  }
}

/**
 * Get metrics in Prometheus exposition format
 * @returns {string} - Metrics in Prometheus format
 */
function getPrometheusMetrics() {
  let output = '# HELP rate_limiting_requests_total Total number of requests\n';
  output += '# TYPE rate_limiting_requests_total counter\n';
  output += `rate_limiting_requests_total ${metrics.counters[METRICS_NAMES.REQUESTS_TOTAL]}\n\n`;

  output += '# HELP rate_limiting_requests_allowed_total Total number of allowed requests\n';
  output += '# TYPE rate_limiting_requests_allowed_total counter\n';
  output += `rate_limiting_requests_allowed_total ${metrics.counters[METRICS_NAMES.REQUESTS_ALLOWED]}\n\n`;

  output += '# HELP rate_limiting_requests_blocked_total Total number of blocked requests\n';
  output += '# TYPE rate_limiting_requests_blocked_total counter\n';
  output += `rate_limiting_requests_blocked_total ${metrics.counters[METRICS_NAMES.REQUESTS_BLOCKED]}\n\n`;

  // Histogram
  const hist = metrics.histograms[METRICS_NAMES.REQUEST_DURATION];
  output += '# HELP rate_limiting_request_duration_seconds Request duration in seconds\n';
  output += '# TYPE rate_limiting_request_duration_seconds histogram\n';
  const buckets = Object.keys(hist.buckets).sort((a, b) => {
    if (a === '+Inf') return 1;
    if (b === '+Inf') return -1;
    return parseFloat(a) - parseFloat(b);
  });
  for (const bucket of buckets) {
    output += `rate_limiting_request_duration_seconds_bucket{le="${bucket}"} ${hist.buckets[bucket]}\n`;
  }
  output += `rate_limiting_request_duration_seconds_count ${hist.count}\n`;
  output += `rate_limiting_request_duration_seconds_sum ${hist.sum}\n\n`;

  // Gauges
  output += '# HELP rate_limiting_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)\n';
  output += '# TYPE rate_limiting_circuit_breaker_state gauge\n';
  output += `rate_limiting_circuit_breaker_state ${metrics.gauges[METRICS_NAMES.CIRCUIT_BREAKER_STATE]}\n\n`;

  output += '# HELP rate_limiting_redis_connection_status Redis connection status (0=disconnected, 1=connected)\n';
  output += '# TYPE rate_limiting_redis_connection_status gauge\n';
  output += `rate_limiting_redis_connection_status ${metrics.gauges[METRICS_NAMES.REDIS_CONNECTION_STATUS]}\n`;

  return output;
}

/**
 * Record request metrics
 * @param {boolean} allowed - Whether request was allowed
 * @param {number} duration - Request duration in seconds
 */
function recordRequest(allowed, duration) {
  incrementCounter(METRICS_NAMES.REQUESTS_TOTAL);
  if (allowed) {
    incrementCounter(METRICS_NAMES.REQUESTS_ALLOWED);
  } else {
    incrementCounter(METRICS_NAMES.REQUESTS_BLOCKED);
  }
  observeHistogram(METRICS_NAMES.REQUEST_DURATION, duration);
}

/**
 * Update circuit breaker state metric
 * @param {string} state - Circuit breaker state ('closed', 'open', 'half_open')
 */
function updateCircuitBreakerState(state) {
  const { CIRCUIT_BREAKER_STATES } = require('../constants');
  const stateValue = {
    [CIRCUIT_BREAKER_STATES.CLOSED]: 0,
    [CIRCUIT_BREAKER_STATES.OPEN]: 1,
    [CIRCUIT_BREAKER_STATES.HALF_OPEN]: 2,
  }[state] || 0;
  setGauge(METRICS_NAMES.CIRCUIT_BREAKER_STATE, stateValue);
}

/**
 * Update Redis connection status metric
 * @param {boolean} connected - Whether Redis is connected
 */
function updateRedisConnectionStatus(connected) {
  setGauge(METRICS_NAMES.REDIS_CONNECTION_STATUS, connected ? 1 : 0);
}

// Initialize metrics on module load
initializeMetrics();

// Export metrics functions
module.exports = {
  incrementCounter,
  observeHistogram,
  setGauge,
  getPrometheusMetrics,
  recordRequest,
  updateCircuitBreakerState,
  updateRedisConnectionStatus,
};