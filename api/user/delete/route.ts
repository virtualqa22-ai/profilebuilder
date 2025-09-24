import { NextRequest, NextResponse } from 'next/server';
import Resume from '../../../backend/models/Resume';
import User from '../../../backend/models/User';
import dbConnect from '../../../backend/dbConnect';
import { requireAuth } from '../../../backend/lib/auth';
import { applySecurityHeaders } from '../../../backend/lib/errorHandler';

/**
 * DELETE /api/user/delete
 * Permanently deletes user account and all associated data
 * Requires authentication
 * WARNING: This operation is irreversible
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await dbConnect();
    // Delete user and all associated data
    await User.findOneAndDelete({ email: session.user.email });
    await Resume.deleteMany({ userId: session.user.id }); // Filter by user ID for proper data isolation

    const response = NextResponse.json({ message: 'Account deleted successfully' });
    applySecurityHeaders(response);
    return response;
  } catch (error) {
    console.error('Error deleting user account:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    applySecurityHeaders(response);
    return response;
  }
}
