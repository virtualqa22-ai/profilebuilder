// Metrics route for the rate limiting microservice
// Exposes Prometheus-compatible metrics for monitoring and alerting

const express = require('express');
const { getPrometheusMetrics } = require('../utils/metrics');

// Create Express router
const router = express.Router();

/**
 * GET /metrics
 * Returns Prometheus-compatible metrics
 */
router.get('/', (req, res) => {
  try {
    const metrics = getPrometheusMetrics();

    // Set appropriate headers for Prometheus scraping
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(metrics, 'utf8'));

    res.status(200).send(metrics);
  } catch (err) {
    res.status(500).send('# Error generating metrics\n');
  }
});

// Export the router
module.exports = router;