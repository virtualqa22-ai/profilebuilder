
import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '@/models/Resume'; // Ensure the model is loaded
import { getLocaleByCode, ILocale } from '@/lib/localeService';


function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
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

    const validateResumeData = (data: any, schema: ILocale) => {
      const errors: Record<string, string> = {};

      Object.entries(schema.sections).forEach(([sectionKey, section]) => {
        if (section.fields && section.order) {
          section.order.forEach((fieldName: string) => {
            const field = section.fields![fieldName];
            const inputId = `${sectionKey}-${fieldName}`;
            if (!field.optional && !data[sectionKey]?.[fieldName]) {
              errors[inputId] = `${field.label} is required.`;
            }
          });
        } else if (section.placeholder && !section.fields) {
          const isSectionOptional = (schema.sections as any)[sectionKey]?.optional;
          if (!isSectionOptional && !data[sectionKey]) {
            errors[sectionKey] = `${section.label} is required.`;
          }
        }
      });

      // Validate work experience
      if (data.workExperience) {
        data.workExperience.forEach((exp: any, index: number) => {
          schema.sections.workExperience.order.forEach((fieldName: string) => {
            const field = schema.sections.workExperience.fields![fieldName];
            const inputId = `workExperience-${index}-${fieldName}`;
            if (!field.optional && !exp[fieldName]) {
              errors[inputId] = `${field.label} in Work Experience #${index + 1} is required.`;
            }
          });
        });
      }

      // Validate education
      if (data.education) {
        data.education.forEach((edu: any, index: number) => {
          schema.sections.education.order.forEach((fieldName: string) => {
            const field = schema.sections.education.fields![fieldName];
            const inputId = `education-${index}-${fieldName}`;
            if (!field.optional && !edu[fieldName]) {
              errors[inputId] = `${field.label} in Education #${index + 1} is required.`;
            }
          });
        });
      }

      return errors;
    };

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
    const res = NextResponse.json({ success: true, data: {} }, { status: 200 });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
