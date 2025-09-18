import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { trackHttpMetrics } from './backend/lib/metrics';

/**
 * Middleware for Request Tracing and Correlation IDs
 *
 * Adds correlation ID to each request for tracing across services.
 * Logs request details for monitoring and debugging.
 */

export function middleware(request: NextRequest) {
  // Generate or use existing correlation ID
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();

  // Clone the response to add headers
  const response = NextResponse.next();

  // Add correlation ID to response headers
  response.headers.set('x-correlation-id', correlationId);

  // Log request details
  const logData = {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString(),
  };

  console.log(`[${correlationId}] ${request.method} ${request.url} - ${JSON.stringify(logData)}`);

  return response;
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