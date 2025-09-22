import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { trackHttpMetrics } from './backend/lib/metrics';
import { Logger } from './backend/lib/logger';

/**
 * Request Context Storage using AsyncLocalStorage
 *
 * Stores correlation ID and request metadata for the duration of the request.
 */
const requestStorage = new (globalThis.AsyncLocalStorage || require('async_hooks').AsyncLocalStorage)();

/**
 * Middleware for Request Tracing and Correlation IDs
 *
 * Adds correlation ID to each request for tracing across services.
 * Logs request details for monitoring and debugging.
 * Stores context in AsyncLocalStorage for use in route handlers.
 */
export function middleware(request: NextRequest) {
  // Generate or use existing correlation ID
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();

  // Create request context
  const requestContext = {
    correlationId,
    startTime: Date.now(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
  };

  // Run the request in the context
  return requestStorage.run(requestContext, () => {
    // Clone the response to add headers
    const response = NextResponse.next();

    // Add correlation ID to response headers
    response.headers.set('x-correlation-id', correlationId);

    // Create logger instance with correlation ID
    const logger = new Logger(correlationId);

    // Log request start
    logger.http('Request started', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    });

    return response;
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};