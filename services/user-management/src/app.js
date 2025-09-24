const express = require('express');
const connectDB = require('./db');
const logger = require('./utils/logger');
const userRoutes = require('./routes/users');

// Resilience patterns implementation
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 60000, monitoringInterval = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.monitoringInterval = monitoringInterval;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.successCount = 0;
    this.nextAttemptTime = null;

    // Monitoring metrics
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastResetTime = Date.now();

    // Start monitoring
    setInterval(() => this.monitor(), this.monitoringInterval);
  }

  async execute(fn) {
    this.totalRequests++;
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.totalSuccesses++;
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) { // Require 2 successes to close
        this.state = 'CLOSED';
        logger.info('Circuit breaker CLOSED');
      }
    }
  }

  onFailure() {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.recoveryTimeout;
      logger.warn(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  monitor() {
    const now = Date.now();
    if (now - this.lastResetTime > 3600000) { // Reset metrics every hour
      this.totalRequests = 0;
      this.totalFailures = 0;
      this.totalSuccesses = 0;
      this.lastResetTime = now;
    }
    logger.info(`Circuit breaker metrics: State=${this.state}, Failures=${this.totalFailures}, Successes=${this.totalSuccesses}, Total=${this.totalRequests}`);
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Bulkhead pattern - limit concurrent requests
class Bulkhead {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.currentRequests = 0;
    this.queue = [];
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      if (this.currentRequests < this.maxConcurrent) {
        this.runTask(fn, resolve, reject);
      } else {
        this.queue.push({ fn, resolve, reject });
      }
    });
  }

  async runTask(fn, resolve, reject) {
    this.currentRequests++;
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.currentRequests--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.runTask(next.fn, next.resolve, next.reject);
      }
    }
  }
}

// Exponential backoff retry
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      logger.warn(`Retry attempt ${attempt} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Timeout middleware
const timeoutMiddleware = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
  };
};

const app = express();

// Initialize resilience components
const circuitBreaker = new CircuitBreaker();
const bulkhead = new Bulkhead(20); // Allow 20 concurrent requests

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size for bulkhead protection
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use(timeoutMiddleware(30000)); // 30 second timeout

// Request logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || require('crypto').randomUUID();
  req.correlationId = correlationId;
  logger.addCorrelationId(correlationId).info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Resilience wrapper for routes
const resilientHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await bulkhead.execute(async () => {
        return await circuitBreaker.execute(async () => {
          return await retryWithBackoff(async () => {
            return await handler(req, res, next);
          }, 3);
        });
      });
    } catch (error) {
      logger.error('Resilient handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Service temporarily unavailable' });
      }
    }
  };
};

// Routes with resilience
app.use('/api/users', resilientHandler(async (req, res, next) => {
  // Wrap the route handler
  const originalSend = res.send;
  res.send = function(data) {
    originalSend.call(this, data);
  };
  return userRoutes(req, res, next);
}));

// Health check endpoint with resilience metrics
app.get('/health', (req, res) => {
  const circuitMetrics = circuitBreaker.getMetrics();
  res.json({
    status: circuitMetrics.state === 'OPEN' ? 'degraded' : 'healthy',
    service: 'user-management-service',
    timestamp: new Date().toISOString(),
    resilience: {
      circuitBreaker: circuitMetrics,
      bulkhead: {
        currentRequests: bulkhead.currentRequests,
        queueLength: bulkhead.queue.length,
        maxConcurrent: bulkhead.maxConcurrent
      }
    }
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const circuitMetrics = circuitBreaker.getMetrics();
  res.json({
    service: 'user-management',
    circuitBreaker: circuitMetrics,
    bulkhead: {
      currentRequests: bulkhead.currentRequests,
      queueLength: bulkhead.queue.length
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Connect to database and start server
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`User Management Service running on port ${PORT} with resilience patterns enabled`);
  });
}).catch((error) => {
  logger.error('Failed to start service:', error);
  process.exit(1);
});

module.exports = app;