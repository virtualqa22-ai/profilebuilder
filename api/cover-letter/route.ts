/**
 * Cover Letter API Routes
 *
 * Handles cover letter generation and template management operations.
 *
 * Endpoints:
 * - POST /api/cover-letter: Generate a cover letter from provided data
 * - GET /api/cover-letter: Retrieve available cover letter templates
 *
 * POST /api/cover-letter
 * Generates a formatted cover letter using the specified template and data.
 *
 * Request Body:
 * {
 *   "name": "John Doe",                    // Required: Applicant's full name
 *   "email": "john@example.com",           // Required: Valid email address
 *   "recipientName": "Jane Smith",         // Required: Recipient's name
 *   "companyName": "Tech Corp",            // Required: Company name
 *   "body": "Cover letter content...",     // Required: Main letter content
 *   "template": "classic",                 // Required: "classic" or "modern"
 *   "address": "123 Main St",              // Optional: Applicant's address
 *   "phone": "+1-555-0123",                // Optional: Phone number
 *   "date": "2024-01-15",                  // Optional: Letter date (defaults to today)
 *   "recipientTitle": "HR Manager",        // Optional: Recipient's title
 *   "companyAddress": "456 Business Ave",  // Optional: Company address
 *   "salutation": "Dear Ms. Smith,",       // Optional: Custom salutation (defaults to "Dear Hiring Manager,")
 *   "closing": "Sincerely,",               // Optional: Closing phrase (defaults to "Sincerely,")
 *   "signature": "John Doe"                // Optional: Signature (defaults to name)
 * }
 *
 * Response (Success):
 * {
 *   "success": true,
 *   "data": {
 *     "coverLetter": "Formatted cover letter text...",
 *     "template": "classic"
 *   }
 * }
 *
 * Response (Validation Error):
 * {
 *   "success": false,
 *   "error": "Validation failed",
 *   "code": "VALIDATION_ERROR",
 *   "details": {
 *     "email": "Invalid email format.",
 *     "template": "Invalid template. Must be 'classic' or 'modern'."
 *   }
 * }
 *
 * GET /api/cover-letter
 * Returns a list of available cover letter templates.
 *
 * Response:
 * {
 *   "success": true,
 *   "templates": [
 *     { "id": "classic", "name": "Classic Template" },
 *     { "id": "modern", "name": "Modern Template" }
 *   ]
 * }
 *
 * Security: All responses include security headers. Input is validated and sanitized.
 * Error Handling: Standardized error responses with appropriate HTTP status codes.
 */

import { NextResponse } from 'next/server';
import { COVER_LETTER_TEMPLATES } from '../../backend/lib/constants';
import { applySecurityHeaders, createErrorResponse, handleValidationError, ERROR_CODES } from '../../backend/lib/errorHandler';
import { validateCoverLetterData, sanitizeString } from '../../backend/lib/validations';


export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input data
    const validationErrors = validateCoverLetterData(body);
    if (Object.keys(validationErrors).length > 0) {
      return handleValidationError(validationErrors);
    }

    // Sanitize input data
    const sanitizedName = sanitizeString(body.name);
    const sanitizedData = {
      name: sanitizedName,
      address: body.address ? sanitizeString(body.address) : '',
      phone: body.phone ? sanitizeString(body.phone) : '',
      email: sanitizeString(body.email),
      date: body.date ? sanitizeString(body.date) : new Date().toLocaleDateString(),
      recipientName: sanitizeString(body.recipientName),
      recipientTitle: body.recipientTitle ? sanitizeString(body.recipientTitle) : '',
      companyName: sanitizeString(body.companyName),
      companyAddress: body.companyAddress ? sanitizeString(body.companyAddress) : '',
      salutation: body.salutation ? sanitizeString(body.salutation) : 'Dear Hiring Manager,',
      body: sanitizeString(body.body),
      closing: body.closing ? sanitizeString(body.closing) : 'Sincerely,',
      signature: body.signature ? sanitizeString(body.signature) : sanitizedName,
      template: body.template,
    };

    // Select and apply template
    const template = COVER_LETTER_TEMPLATES[sanitizedData.template as keyof typeof COVER_LETTER_TEMPLATES];
    if (!template) {
      return createErrorResponse('Invalid template selected', 400, ERROR_CODES.BAD_REQUEST);
    }

    // Generate cover letter
    const generatedCoverLetter = template(sanitizedData);

    const res = NextResponse.json({
      success: true,
      data: {
        coverLetter: generatedCoverLetter,
        template: sanitizedData.template
      }
    });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(error.message, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

export async function GET() {
  try {
    // Fetch available cover letter templates from COVER_LETTER_TEMPLATES keys
    const templates = Object.keys(COVER_LETTER_TEMPLATES).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1) + ' Template'
    }));

    const res = NextResponse.json({ success: true, templates });
    applySecurityHeaders(res);
    return res;
  } catch (error: any) {
    return createErrorResponse(error.message, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}
