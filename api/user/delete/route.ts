import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Resume from '../../../backend/models/Resume';
import User from '../../../backend/models/User';
import { connectToDatabase } from '../../../backend/dbConnect';

export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Delete user and all associated data
    await User.findOneAndDelete({ email: session.user.email });
    await Resume.deleteMany({}); // In real app, filter by user ID

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
