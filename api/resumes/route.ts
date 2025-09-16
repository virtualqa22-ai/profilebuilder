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

export async function GET() {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  try {
    const resumes = await Resume.find({});
    const res = NextResponse.json({ success: true, data: resumes });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}

export async function POST(req: Request) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  try {
    const body = await req.json();
  const { locale = 'en-US', ...resumeData } = body; // Extract locale, default to en-US

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

      // Validate optional fields based on locale schema
      if (schema.optionalFields) {
        for (const fieldName of ['photos', 'certifications', 'hobbies', 'references']) {
          const fieldConfig = (schema.optionalFields as any)[fieldName];
          if (fieldConfig && fieldConfig.enabled && fieldConfig.required && !data[fieldName]) {
            errors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required for this locale.`;
          }
        }
      }

      return errors;
    };

    const validationErrors = validateResumeData(resumeData, selectedLocaleData);

    if (Object.keys(validationErrors).length > 0) {
      const res = NextResponse.json({ success: false, errors: validationErrors }, { status: 400 });
      setSecurityHeaders(res);
      return res;
    }

  const resume = await Resume.create({ ...resumeData, locale });
    const res = NextResponse.json({ success: true, data: resume }, { status: 201 });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}