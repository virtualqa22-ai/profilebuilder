import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '../../../backend/lib/errorHandler';
import { getRequestLogger } from '../../../backend/lib/logger';

/**
 * GET /api/ads/config
 * Returns ad configuration settings for the application
 *
 * Provides configuration data for ad serving and tracking,
 * including enabled status and other ad-related settings.
 * Configuration is sourced from environment variables for security.
 *
 * Security features:
 * - No sensitive data exposure
 * - Security headers applied
 * - Request logging for monitoring
 *
 * @param request - NextRequest containing the GET request
 * @returns NextResponse with ad configuration data
 */
export async function GET(request: NextRequest) {
  const logger = getRequestLogger();
  const startTime = Date.now();

  try {
    // Retrieve ad configuration from environment variables
    // Default to disabled if not set for security
    const adsEnabled = process.env.ADS_ENABLED === 'true';
    const adProviders = process.env.AD_PROVIDERS ? process.env.AD_PROVIDERS.split(',') : [];
    const maxAdsPerPage = parseInt(process.env.MAX_ADS_PER_PAGE || '3', 10);

    // Validate maxAdsPerPage to prevent unreasonable values
    const validMaxAdsPerPage = Math.min(Math.max(maxAdsPerPage, 0), 10); // Max 10 ads per page

    const config = {
      adsEnabled,
      adProviders: adsEnabled ? adProviders : [], // Only expose providers if ads are enabled
      maxAdsPerPage: validMaxAdsPerPage,
      // Add other config as needed, e.g., adRefreshInterval, targetingEnabled, etc.
    };

    logger.info('Ad configuration retrieved', {
      adsEnabled,
      providerCount: adProviders.length,
      maxAdsPerPage: validMaxAdsPerPage,
      duration: Date.now() - startTime
    });

    const response = NextResponse.json({ success: true, data: config });
    applySecurityHeaders(response);
    return response;

  } catch (error: any) {
    logger.error('Error retrieving ad configuration', error, {
      duration: Date.now() - startTime
    });
    // Return a safe default configuration on error
    const response = NextResponse.json({
      success: true,
      data: {
        adsEnabled: false,
        adProviders: [],
        maxAdsPerPage: 0
      }
    });
    applySecurityHeaders(response);
    return response;
  }
}

/**
 * POST /api/ads/config
 * Not implemented - configuration is read-only
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}