
/**
 * Locales API Route
 *
 * Provides locale configuration data for internationalization support.
 * Returns available locales with their schemas for resume building.
 *
 * Business Rules:
 * - Public endpoint accessible without authentication
 * - Returns cached locale data for performance
 * - Supports multiple locales for global user base
 *
 * Security Measures:
 * - Comprehensive security headers to prevent common attacks
 * - XSS protection and content type sniffing prevention
 * - Strict referrer policy for privacy protection
 * - HSTS for secure transport enforcement
 * - Permissions policy to restrict browser features
 */

import { NextResponse } from 'next/server';
import { getLocales } from '@/backend/lib/localeService';
import { getCacheManager } from '@/backend/lib/cacheManager';

/**
 * Sets comprehensive security headers on API responses
 * Implements OWASP security headers to protect against common web vulnerabilities
 * @param res - NextResponse object to modify with security headers
 */
function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  res.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Prevent clickjacking
  res.headers.set('X-XSS-Protection', '1; mode=block'); // Enable XSS filtering
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Control referrer information
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()'); // Restrict browser permissions
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'); // Enforce HTTPS (2 years)
}

/**
 * GET /api/locales
 *
 * Retrieves available locale configurations for internationalization.
 * Returns locale schemas used for resume building and validation.
 *
 * @returns NextResponse with locale data or error
 * @response 200 { success: true, data: Locale[] } - Successful locale retrieval
 * @response 500 { success: false, error: string } - Server error with message
 */
export async function GET() {
  try {
    const locales = getLocales(); // Retrieve cached locale configurations
    const res = NextResponse.json({ success: true, data: locales });
    setSecurityHeaders(res); // Apply comprehensive security headers
    return res;
  } catch (error: any) {
    // Log error for monitoring (error handling best practice)
    console.error('Error retrieving locales:', error);
    const res = NextResponse.json(
      { success: false, error: error.message },
      { status: 500 } // Standard HTTP status for server errors
    );
    setSecurityHeaders(res); // Maintain security even on errors
    return res;
  }
}
