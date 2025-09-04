
import { NextRequest, NextResponse } from 'next/server';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import { parseResume } from '@/lib/resumeParser';
import { getLocaleByCode } from '@/lib/localeService';

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    const res = NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }

  if (file.type !== 'application/pdf') {
    const res = NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }

  if (file.size === 0) {
    const res = NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  try {
    const loadingTask = pdfjs.getDocument({ data: uint8Array }); // Pass data as an object
    const pdfDocument = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }

    const locale = getLocaleByCode('en-US'); // Hardcoded for now
    if (!locale) {
      const res = NextResponse.json({ error: 'Default locale not found' }, { status: 500 });
      setSecurityHeaders(res);
      return res;
    }
    const resumeData = parseResume(fullText, locale);
    const res = NextResponse.json(resumeData);
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    console.error('Error processing PDF or parsing resume:', error);
    const res = NextResponse.json({ error: 'Failed to process PDF or parse resume', details: error.message }, { status: 500 });
    setSecurityHeaders(res);
    return res;
  }
}