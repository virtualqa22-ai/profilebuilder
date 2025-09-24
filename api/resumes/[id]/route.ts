import dbConnect from '../../../backend/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '../../../backend/models/Resume'; // Ensure the model is loaded
import { getLocaleByCode, ILocale } from '../../../backend/lib/localeService';
import { getCacheManager, CacheKeys } from '../../../backend/lib/cacheManager';
import { requireAuth } from '../../../backend/lib/auth';
import { validateResumeModelData } from '../../../backend/lib/validations';
import { applySecurityHeaders, createErrorResponse, ERROR_CODES } from '../../../backend/lib/errorHandler';

/**
 * GET /api/resumes/[id]
 * Retrieves a specific resume by ID
 * Requires authentication and user ownership
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const session = await requireAuth(req as any);
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

    // Check if resume exists
    const resume = await Resume.findById(id);
    if (!resume) {
      return createErrorResponse('Resume not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Check ownership
    if (resume.userId.toString() !== user._id.toString()) {
      return createErrorResponse('Access denied: Resume does not belong to user', 403, ERROR_CODES.FORBIDDEN);
    }

    // Parse query parameters for selective field retrieval
    const url = new URL(req.url);
    const includeContent = url.searchParams.get('includeContent') !== 'false'; // Default to true for individual resume view

    // Define projection based on includeContent parameter
    // For individual resume view, include content by default but allow exclusion for metadata-only requests
    const projection = includeContent ? {} : { content: 0, photos: 0, certifications: 0, hobbies: 0, references: 0 };

    // Re-fetch with projection if needed
    const resumeData = includeContent ? resume : await Resume.findById(id, projection);

    const res = NextResponse.json({ success: true, data: resumeData });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(`Failed to retrieve resume: ${error.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * PUT /api/resumes/[id]
 * Updates a specific resume by ID
 * Requires authentication and user ownership
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const session = await requireAuth(req as any);
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

    // Check if resume exists
    const existingResume = await Resume.findById(id);
    if (!existingResume) {
      return createErrorResponse('Resume not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Check ownership
    if (existingResume.userId.toString() !== user._id.toString()) {
      return createErrorResponse('Access denied: Resume does not belong to user', 403, ERROR_CODES.FORBIDDEN);
    }

    const body = await req.json();
    let { locale, ...resumeData } = body;

    // If locale is not provided in the body, use the existing locale
    if (!locale) {
      locale = existingResume.locale || 'en-US';
    }

    const selectedLocaleData = getLocaleByCode(locale);
    if (!selectedLocaleData) {
      return createErrorResponse('Invalid locale provided', 400, ERROR_CODES.BAD_REQUEST);
    }

    const validationErrors = validateResumeModelData({ ...resumeData, locale });

    if (Object.keys(validationErrors).length > 0) {
      return createErrorResponse('Validation failed', 400, ERROR_CODES.BAD_REQUEST, validationErrors);
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId: user._id },
      { ...resumeData, $inc: { version: 1 } },
      {
        new: true,
        runValidators: true,
      }
    );

    // Invalidate cache entries affected by the update
    const cacheManager = getCacheManager();
    await cacheManager.invalidatePattern('resumes:list:*');
    await cacheManager.delete(CacheKeys.resume(id));

    const res = NextResponse.json({ success: true, data: resume });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(`Failed to update resume: ${error.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * DELETE /api/resumes/[id]
 * Deletes a specific resume by ID
 * Requires authentication and user ownership
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const session = await requireAuth(req as any);
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

    // Check if resume exists
    const resume = await Resume.findById(id);
    if (!resume) {
      return createErrorResponse('Resume not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Check ownership
    if (resume.userId.toString() !== user._id.toString()) {
      return createErrorResponse('Access denied: Resume does not belong to user', 403, ERROR_CODES.FORBIDDEN);
    }

    const deletedResume = await Resume.deleteOne({ _id: id, userId: user._id });
    if (!deletedResume.deletedCount) {
      return createErrorResponse('Resume not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Invalidate cache entries affected by the deletion
    const cacheManager = getCacheManager();
    await cacheManager.invalidatePattern('resumes:list:*');
    await cacheManager.delete(CacheKeys.resume(id));

    const res = NextResponse.json({ success: true, data: {} });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(`Failed to delete resume: ${error.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}
