import { NextResponse } from 'next/server';
import dbConnect from '../../backend/dbConnect';
import { applySecurityHeaders, handleDatabaseError } from '../../backend/lib/errorHandler';
import { getRequestLogger } from '../../backend/lib/logger';

/**
 * Health Check Endpoint
 *
 * Provides comprehensive health status for the profilebuilder service.
 * Used by load balancers, monitoring systems, and deployment pipelines
 * to verify service availability and operational status.
 *
 * Checks performed:
 * - Service availability: Always returns healthy if endpoint is reachable
 * - Database connectivity: Tests MongoDB connection via dbConnect()
 * - System metrics: Memory usage, uptime, version information
 * - Response time: Measures endpoint performance
 *
 * Response format:
 * {
 *   "status": "healthy",           // "healthy" or error status
 *   "service": "profilebuilder",   // Service identifier
 *   "timestamp": "2024-01-15T...", // ISO timestamp
 *   "uptime": 123.45,              // Process uptime in seconds
 *   "version": "1.0.0",            // Application version
 *   "checks": {
 *     "database": "healthy",       // Database connection status
 *     "memory": {
 *       "used": 50,                 // Heap used in MB
 *       "total": 100,               // Heap total in MB
 *       "unit": "MB"
 *     }
 *   },
 *   "responseTime": 15             // Response time in milliseconds
 * }
 *
 * HTTP Status Codes:
 * - 200: Service is healthy
 * - 500: Service is unhealthy (database connection failed)
 */
/**
 * Health Check Endpoint
 *
 * Provides health status for the profilebuilder service including:
 * - Service availability
 * - Database connectivity
 * - Basic system metrics
 */

export async function GET(request: Request) {
  // Deprecation notice: This endpoint is deprecated. Use /api/v1/health instead.
  // Redirect to versioned endpoint for backward compatibility
  const v1Url = new URL('/api/v1/health', request.url);
  const res = NextResponse.redirect(v1Url);
  res.headers.set('Deprecation', 'true');
  res.headers.set('Link', '</api/v1/health>; rel="successor-version"');
  return res;
}