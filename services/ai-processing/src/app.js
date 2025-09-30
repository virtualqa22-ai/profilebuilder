// AI Processing Service Main Application
// Express.js server with comprehensive middleware and routing

require('dotenv').config();
const express = require('express');
const aiRoutes = require('./routes/ai-routes');
const { info: logInfo, error: logError } = require('./utils/logger');
const { MESSAGES } = require('./utils/constants');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Security middleware
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS headers (adjust origins as needed)
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging middleware (basic)
app.use((req, res, next) => {
  logInfo('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// API routes
app.use('/api/ai', aiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Processing Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      process: 'POST /api/ai/process',
      batch: 'POST /api/ai/process-batch',
      validate: 'POST /api/ai/validate',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /metrics',
      'POST /api/ai/process',
      'POST /api/ai/process-batch',
      'POST /api/ai/validate',
    ],
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logError('Unhandled application error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    correlationId: req.correlationId,
  });

  res.status(500).json({
    success: false,
    error: MESSAGES.ERRORS.INTERNAL_ERROR,
    correlationId: req.correlationId,
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Promise Rejection', {
    reason: reason.message || reason,
    stack: reason.stack,
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logInfo('AI Processing Service started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });

    console.log(`🚀 AI Processing Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  });
}

module.exports = app;