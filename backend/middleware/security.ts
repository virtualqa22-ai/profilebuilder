import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Security Middleware Configuration
 *
 * Enhanced security measures including rate limiting, CORS policies,
 * comprehensive security headers, and protection against common attacks.
 */

// General API rate limiter (higher limit for normal operations)
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter (stricter limits for auth endpoints)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

// File upload rate limiter (stricter for uploads)
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    error: 'Upload limit exceeded, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced Helmet middleware with comprehensive security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust based on needs
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"], // Add your API domains
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" },
  crossOriginEmbedderPolicy: false, // Set to true if needed for cross-origin isolation
});

// Enhanced CORS middleware with strict origin validation
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000', // Development
      'http://localhost:3001', // Development
    ].filter(Boolean); // Remove undefined values

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
});

// Additional security headers middleware
export const securityHeaders = (req: any, res: any, next: any) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent MIME type sniffing
  res.setHeader('X-Download-Options', 'noopen');

  // IE security
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  next();
};

// CSRF protection middleware (basic implementation)
export const csrfProtection = (req: any, res: any, next: any) => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_INVALID'
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (req: any, res: any, next: any) => {
  const contentLength = parseInt(req.headers['content-length']);

  if (contentLength && contentLength > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      error: 'Request entity too large',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  next();
};
