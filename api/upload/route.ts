import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { createErrorResponse, ERROR_CODES } from '../../backend/lib/errorHandler';

export const runtime = 'nodejs';

// File upload configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

/**
 * Validates file upload
 * @param file - The uploaded file
 * @returns Validation result with error message if invalid
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Only images and PDFs are permitted.' };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, error: 'File extension not allowed' };
  }

  // Check for potentially dangerous filenames
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^\./,  // Hidden files
    /[\x00-\x1f\x7f]/  // Control characters
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return { valid: false, error: 'Invalid filename' };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes filename to prevent security issues
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  // Remove path components and dangerous characters
  let sanitized = filename.replace(/[/\\:*?"<>|]/g, '');
  // Replace multiple dots with single dot
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 95) + '.' + ext;
  }
  return sanitized || 'unnamed_file';
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return createErrorResponse(validation.error!, 400, ERROR_CODES.BAD_REQUEST);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize and generate unique filename
    const sanitizedName = sanitizeFilename(file.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${sanitizedName}`;
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);

    // Ensure uploads directory exists (in production, this should be handled by deployment)
    // For now, we'll assume it exists

    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/${fileName}`;

    const res = NextResponse.json({ success: true, url: fileUrl });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    console.error('File upload error:', error);
    return createErrorResponse('File upload failed', 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}
