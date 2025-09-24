import { NextRequest, NextResponse } from 'next/server';
import User from '../../../backend/models/User';
import dbConnect from '../../../backend/dbConnect';
import { getCacheManager } from '../../../backend/lib/cacheManager';
import { requireAuth } from '../../../backend/lib/auth';
import { applySecurityHeaders } from '../../../backend/lib/errorHandler';

/**
 * GET /api/user/settings
 * Retrieves user privacy settings
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const cacheManager = getCacheManager();
    const cacheKey = `user:settings:${session.user.email}`;

    // Try to get from cache first
    let settings = await cacheManager.get(cacheKey);

    if (!settings) {
      // Cache miss - fetch from database
      await dbConnect();
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
        applySecurityHeaders(response);
        return response;
      }

      settings = { privacyMode: user.privacyMode };

      // Cache the result for future requests (TTL: 15 minutes for settings)
      await cacheManager.set(cacheKey, settings, 900);
    }

    const response = NextResponse.json(settings);
    applySecurityHeaders(response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/settings
 * Updates user privacy settings
 * Requires authentication
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const { privacyMode } = await request.json();
    await dbConnect();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { privacyMode },
      { new: true, upsert: true }
    );

    // Invalidate cache when settings are updated
    const cacheManager = getCacheManager();
    await cacheManager.delete(`user:settings:${session.user.email}`);

    const response = NextResponse.json({ privacyMode: user.privacyMode });
    applySecurityHeaders(response);
    return response;
  } catch (error) {
    console.error('Error updating user settings:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    applySecurityHeaders(response);
    return response;
  }
}
