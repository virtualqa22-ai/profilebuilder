import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import User from '../../../backend/models/User';
import { connectToDatabase } from '../../../backend/dbConnect';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ privacyMode: user.privacyMode });
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

    return NextResponse.json({ privacyMode: user.privacyMode });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
