
import dbConnect from '../../../backend/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '../../../backend/models/Resume'; // Ensure the model is loaded
import { requireAuth } from '../../../backend/lib/auth';
import { applySecurityHeaders, createErrorResponse, ERROR_CODES } from '../../../backend/lib/errorHandler';

/**
 * Set security headers for API responses
 * Implements comprehensive security measures for all responses
 */
function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

/**
 * POST /api/resumes/[id]/comments
 * Adds a new comment to a specific resume
 * Requires authentication and user ownership of the resume
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    // Get authenticated user
    if (!session?.user?.email) {
      return createErrorResponse('User session not found', 401, ERROR_CODES.UNAUTHORIZED);
    }
    await dbConnect();
    const UserModel = mongoose.model('User');
    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return createErrorResponse('User not found', 404, ERROR_CODES.NOT_FOUND);
    }

    const Resume = mongoose.model('Resume');
    const { id } = params;

    // Check if resume exists and belongs to user
    const resume = await Resume.findById(id);
    if (!resume) {
      return createErrorResponse('Resume not found', 404, ERROR_CODES.NOT_FOUND);
    }
    if (resume.userId.toString() !== user._id.toString()) {
      return createErrorResponse('Access denied: Resume does not belong to user', 403, ERROR_CODES.FORBIDDEN);
    }

    // Validate input
    const { field, text, author } = await req.json();
    if (!field || !text || !author) {
      return createErrorResponse('Missing required fields: field, text, author', 400, ERROR_CODES.BAD_REQUEST);
    }

    // Add comment
    resume.comments.push({ field, text, author });
    await resume.save();

    const res = NextResponse.json({ success: true, data: resume.comments }, { status: 201 });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(`Failed to add comment: ${error.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}
