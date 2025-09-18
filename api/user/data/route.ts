import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Resume from '../../../backend/models/Resume';
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
    const resumes = await Resume.find({}); // Assuming all resumes are user's, but in real app, filter by user

    const data = {
      user,
      resumes,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="user-data.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
