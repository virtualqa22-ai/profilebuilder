import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Resume from '../../../backend/models/Resume';
import User from '../../../backend/models/User';
import { connectToDatabase } from '../../../backend/dbConnect';
import { getCacheManager } from '../../../backend/lib/cacheManager';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheManager = getCacheManager();
    const cacheKey = `user:data:${session.user.email}`;

    // Try to get from cache first
    let userData = await cacheManager.get(cacheKey);

    if (!userData) {
      // Cache miss - fetch from database
      await connectToDatabase();
      const user = await User.findOne({ email: session.user.email });

      // TODO: Add user field to Resume model for proper data isolation
      // Currently fetching all resumes due to missing user association
      // This is a security and performance issue that should be addressed
      const resumes = await Resume.find({})
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

    return new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="user-data.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
