/**
 * Metrics Module
 *
 * Provides Prometheus-compatible metrics for monitoring application performance.
 * Includes counters, histograms, and gauges for latency, throughput, and errors.
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics collection (CPU, memory, etc.)
collectDefaultMetrics();

// HTTP Request Counter
export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10],
});

// Database Query Counter
export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'collection'],
});

// Database Query Duration Histogram
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5],
});

// Error Counter
export const errorTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
});

// Active Connections Gauge
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Memory Usage Gauge
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
});

// AI Request Counter
export const aiRequestTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['operation', 'model'],
});

// AI Request Duration Histogram
export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI requests in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30],
});

// Middleware for tracking HTTP metrics
export const trackHttpMetrics = (method: string, route: string, statusCode: number, duration: number) => {
  httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe({ method, route }, duration / 1000); // Convert to seconds
};

// Middleware for tracking database metrics
export const trackDbMetrics = (operation: string, collection: string, duration: number) => {
  dbQueryTotal.inc({ operation, collection });
  dbQueryDuration.observe({ operation, collection }, duration / 1000);
};

// Middleware for tracking AI metrics
export const trackAiMetrics = (operation: string, model: string, duration: number) => {
  aiRequestTotal.inc({ operation, model });
  aiRequestDuration.observe({ operation, model }, duration / 1000);
};

// Update memory metrics
export const updateMemoryMetrics = () => {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'external' }, memUsage.external);
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
};

// Export metrics registry
export { register };