import dbConnect from '../../../backend/dbConnect';
import { NextRequest, NextResponse } from 'next/server';
import { validateAdMetricData } from '../../../backend/lib/validations';
import { createErrorResponse, handleDatabaseError, handleValidationError, applySecurityHeaders, ERROR_CODES } from '../../../backend/lib/errorHandler';
import { getRequestLogger } from '../../../backend/lib/logger';
import AdMetric from '../../../backend/models/AdMetric';
import crypto from 'crypto';

/**
 * Rate limiter for ad metrics tracking
 * Limits requests per hashed user ID to prevent abuse
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests = 100; // Max requests per window
  private readonly windowMs = 60 * 1000; // 1 minute window

  /**
   * Check if request is allowed for the given key
   * @param key - Rate limit key (e.g., hashed user ID)
   * @returns True if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing timestamps for this key
    let timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if under limit
    if (timestamps.length < this.maxRequests) {
      // Add current timestamp
      timestamps.push(now);
      this.requests.set(key, timestamps);
      return true;
    }

    return false;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Anonymize user ID using SHA-256 hash with salt
 * @param userId - Original user ID
 * @returns Hashed user ID
 */
function anonymizeUserId(userId: string): string {
  const salt = process.env.ANONYMIZATION_SALT;
  if (!salt) {
    throw new Error('ANONYMIZATION_SALT environment variable is not set');
  }
  return crypto.createHash('sha256').update(userId + salt).digest('hex');
}

/**
 * POST /api/ads/metrics
 * Tracks ad interaction metrics with privacy protection and rate limiting
 *
 * Request body:
 * - user_id: string (required) - User identifier to be anonymized
 * - ad_id: string (required) - Advertisement identifier
 * - event_type: string (required) - Type of interaction (impression, click, view, hover, close)
 * - metadata: object (optional) - Additional event data
 *
 * Security features:
 * - User ID anonymization via SHA-256 hashing
 * - Rate limiting (100 requests per minute per user)
 * - Input validation and sanitization
 * - Comprehensive error handling and logging
 *
 * @param request - NextRequest containing metric data
 * @returns NextResponse with success/error status
 */
export async function POST(request: NextRequest) {
  const logger = getRequestLogger();
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { user_id, ad_id, event_type, metadata } = body;

    // Validate input data
    const validationErrors = validateAdMetricData({ user_id, ad_id, event_type, metadata });
    if (Object.keys(validationErrors).length > 0) {
      logger.warn('Ad metric validation failed', { errors: validationErrors });
      return handleValidationError(validationErrors);
    }

    // Anonymize user ID
    const hashedUserId = anonymizeUserId(user_id);
    logger.debug('User ID anonymized for ad metric tracking', { originalLength: user_id.length, hashedUserId });

    // Apply rate limiting
    if (!rateLimiter.isAllowed(hashedUserId)) {
      logger.warn('Rate limit exceeded for ad metric tracking', { hashedUserId });
      return createErrorResponse('Rate limit exceeded. Please try again later.', 429, ERROR_CODES.BAD_REQUEST);
    }

    // Connect to database
    await dbConnect();

    // Create and save ad metric
    const adMetric = new AdMetric({
      hashedUserId,
      adId: ad_id,
      eventType: event_type,
      metadata: metadata || {},
    });

    await adMetric.save();

    logger.info('Ad metric tracked successfully', {
      adId: ad_id,
      eventType: event_type,
      hashedUserId,
      duration: Date.now() - startTime
    });

    const response = NextResponse.json({ success: true, message: 'Metric tracked successfully' });
    applySecurityHeaders(response);
    return response;

  } catch (error: any) {
    logger.error('Error tracking ad metric', error, {
      duration: Date.now() - startTime
    });
    return handleDatabaseError(error);
  }
}

/**
 * GET /api/ads/metrics
 * Not implemented - metrics are write-only for privacy
 */
export async function GET() {
  return createErrorResponse('Method not allowed', 405);
}