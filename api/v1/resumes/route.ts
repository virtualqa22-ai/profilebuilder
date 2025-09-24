import dbConnect from '../../../backend/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '../../../backend/models/Resume'; // Ensure the model is loaded
import { getServerSession } from 'next-auth';
import { getLocaleByCode, ILocale } from '../../../backend/lib/localeService';
import { validateResumeModelData } from '../../../backend/lib/validations';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../backend/lib/messages';
import { SECURITY_HEADERS, DEFAULT_LOCALE, MAX_TITLE_LENGTH } from '../../../backend/lib/constants';
import { applySecurityHeaders, createErrorResponse, handleDatabaseError, handleValidationError, ERROR_CODES } from '../../../backend/lib/errorHandler';
import { getCacheManager, CacheKeys } from '../../../backend/lib/cacheManager';
import { requireAuth } from '../../../backend/lib/auth';


export async function GET(request: Request) {
  // Check authentication
  const session = await requireAuth(request as any);
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

    // Parse query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const locale = url.searchParams.get('locale');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrderStr = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const sortOrder = sortOrderStr === 'asc' ? 1 : -1;
    const includeContent = url.searchParams.get('includeContent') === 'true';

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page

    // Implement caching strategy with pagination support
    const cacheManager = getCacheManager();
    const cacheKey = CacheKeys.resumesList(validPage, validLimit, locale, sortBy, sortOrderStr, includeContent);

    // Try to get from cache first
    let cachedResult = await cacheManager.get(cacheKey);

    if (cachedResult) {
      const res = NextResponse.json(cachedResult);
      applySecurityHeaders(res);
      return res;
    }

    // Cache miss - fetch from database with optimizations
    const Resume = mongoose.model('Resume');

    // Build query with userId filter and optional locale filter
    const query: any = { userId: user._id };
    if (locale) {
      query.locale = locale;
    }

    // Define projection based on includeContent parameter
    // For list views, exclude large content field by default for better performance
    const projection = includeContent ? {} : { content: 0, photos: 0, certifications: 0, hobbies: 0, references: 0 };

    // Calculate skip value for pagination
    const skip = (validPage - 1) * validLimit;

    // Execute optimized query with pagination and sorting
    const resumes = await Resume.find(query, projection)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(validLimit)
      .lean(); // Use lean() for better performance (plain objects instead of mongoose documents)

    // Get total count for pagination metadata
    const total = await Resume.countDocuments(query);

    const result = {
      success: true,
      data: resumes,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit),
        hasNext: validPage * validLimit < total,
        hasPrev: validPage > 1
      }
    };

    // Cache the result for future requests (TTL: 5 minutes for dynamic data)
    await cacheManager.set(cacheKey, result, 300);

    const res = NextResponse.json(result);
    applySecurityHeaders(res);
    return res;
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(req: Request) {
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
    // Extract locale from request body, defaulting to en-US for backward compatibility
    // Locale determines the validation schema and field requirements
    const body = await req.json();
  const { locale = 'en-US', ...resumeData } = body; // Extract locale, default to en-US

    const selectedLocaleData = getLocaleByCode(locale);
    if (!selectedLocaleData) {
      return createErrorResponse('Invalid locale provided', 400, ERROR_CODES.BAD_REQUEST);
    }


    const validationErrors = validateResumeModelData({ ...resumeData, locale });

    if (Object.keys(validationErrors).length > 0) {
      return handleValidationError(validationErrors);
    }

    // Create the resume with user association
    const resume = await Resume.create({ ...resumeData, locale, userId: user._id });

    // Invalidate related cache keys selectively when new resume is created
    // This ensures data consistency for the specific locale and 'all' locale caches
    const cacheManager = getCacheManager();
    await cacheManager.invalidatePattern(`resumes:list:*:*:${locale}:*:*:*`);
    await cacheManager.invalidatePattern('resumes:list:*:*:all:*:*:*');

    const res = NextResponse.json({ success: true, data: resume }, { status: 201 });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return handleDatabaseError(error);
  }
}