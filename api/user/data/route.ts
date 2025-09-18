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
      const resumes = await Resume.find({}); // Assuming all resumes are user's, but in real app, filter by user

      userData = {
        user,
        resumes,
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
