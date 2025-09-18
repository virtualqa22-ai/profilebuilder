import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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
    const cacheKey = `user:settings:${session.user.email}`;

    // Try to get from cache first
    let settings = await cacheManager.get(cacheKey);

    if (!settings) {
      // Cache miss - fetch from database
      await connectToDatabase();
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      settings = { privacyMode: user.privacyMode };

      // Cache the result for future requests (TTL: 15 minutes for settings)
      await cacheManager.set(cacheKey, settings, 900);
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { privacyMode } = await request.json();
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { privacyMode },
      { new: true, upsert: true }
    );

    // Invalidate cache when settings are updated
    const cacheManager = getCacheManager();
    await cacheManager.delete(`user:settings:${session.user.email}`);

    return NextResponse.json({ privacyMode: user.privacyMode });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
