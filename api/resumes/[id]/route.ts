
import dbConnect from '../../../backend/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '../../../backend/models/Resume'; // Ensure the model is loaded
import { getLocaleByCode, ILocale } from '../../../backend/lib/localeService';
import { getCacheManager, CacheKeys } from '../../../backend/lib/cacheManager';
import { requireAuth } from '../../../backend/lib/auth';
import { validateResumeData } from '../../../shared/validations';


function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const authResult = await requireAuth(req);
  if (authResult) return authResult;
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;

  // Parse query parameters for selective field retrieval
  const url = new URL(req.url);
  const includeContent = url.searchParams.get('includeContent') !== 'false'; // Default to true for individual resume view

  try {
    // Define projection based on includeContent parameter
    // For individual resume view, include content by default but allow exclusion for metadata-only requests
    const projection = includeContent ? {} : { content: 0, photos: 0, certifications: 0, hobbies: 0, references: 0 };

    const resume = await Resume.findById(id, projection);
    if (!resume) {
      const res = NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
      setSecurityHeaders(res);
      return res;
    }
    const res = NextResponse.json({ success: true, data: resume });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const authResult = await requireAuth(req as any);
  if (authResult) return authResult;

  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const body = await req.json();
    let { locale, ...resumeData } = body;

    // If locale is not provided in the body, try to get it from the existing resume
    if (!locale) {
      const existingResume = await Resume.findById(id);
      if (existingResume && existingResume.locale) {
        locale = existingResume.locale;
      } else {
        locale = 'en-US'; // Default locale if not found
      }
    }

    const selectedLocaleData = getLocaleByCode(locale);
    if (!selectedLocaleData) {
      const res = NextResponse.json({ success: false, error: 'Invalid locale provided' }, { status: 400 });
      setSecurityHeaders(res);
      return res;
    }

    const validationErrors = validateResumeData(resumeData, selectedLocaleData);

    if (Object.keys(validationErrors).length > 0) {
      const res = NextResponse.json({ success: false, errors: validationErrors }, { status: 400 });
      setSecurityHeaders(res);
      return res;
    }

    const resume = await Resume.findByIdAndUpdate(
      id,
      { ...resumeData, $inc: { version: 1 } },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!resume) {
      const res = NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
      setSecurityHeaders(res);
      return res;
    }

    // Invalidate cache entries affected by the update
    const cacheManager = getCacheManager();
    await cacheManager.invalidatePattern('resumes:list:*');
    await cacheManager.delete(CacheKeys.resume(id));

    const res = NextResponse.json({ success: true, data: resume });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // Check authentication
  const authResult = await requireAuth(req as any);
  if (authResult) return authResult;

  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const deletedResume = await Resume.deleteOne({ _id: id });
    if (!deletedResume.deletedCount) {
      const res = NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
      setSecurityHeaders(res);
      return res;
    }

    // Invalidate cache entries affected by the deletion
    const cacheManager = getCacheManager();
    await cacheManager.invalidatePattern('resumes:list:*');
    await cacheManager.delete(CacheKeys.resume(id));

    const res = NextResponse.json({ success: true, data: {} }, { status: 200 });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
