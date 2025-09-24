import { NextRequest, NextResponse } from 'next/server';
import Resume from '../../../backend/models/Resume';
import User from '../../../backend/models/User';
import dbConnect from '../../../backend/dbConnect';
import { getCacheManager } from '../../../backend/lib/cacheManager';
import { requireAuth } from '../../../backend/lib/auth';
import { applySecurityHeaders } from '../../../backend/lib/errorHandler';

/**
 * GET /api/user/data
 * Exports user data including profile and resume metadata
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const cacheManager = getCacheManager();
    const cacheKey = `user:data:${session.user.email}`;

    // Try to get from cache first
    let userData = await cacheManager.get(cacheKey);

    if (!userData) {
      // Cache miss - fetch from database
      await dbConnect();
      const user = await User.findOne({ email: session.user.email });

      // Filter resumes by authenticated user's ID for proper data isolation
      const resumes = await Resume.find({ userId: user._id })
        .select('title locale version createdAt updatedAt') // Only fetch metadata for user data export
        .sort({ createdAt: -1 })
        .limit(50) // Limit to prevent excessive data export
        .lean();

      userData = {
        user,
        resumes,
        _metadata: {
          resumeCount: resumes.length,
          limited: resumes.length >= 50, // Indicate if results were truncated
          note: 'Resume data is limited to metadata only for performance and security'
        }
      };

      // Cache the result for future requests (TTL: 10 minutes for user data)
      await cacheManager.set(cacheKey, userData, 600);
    }

    const response = new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="user-data.json"',
      },
    });
    applySecurityHeaders(response);
    return response;
  } catch (error) {
    console.error('Error exporting user data:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    applySecurityHeaders(response);
    return response;
  }
}
