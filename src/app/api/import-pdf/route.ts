import { NextRequest, NextResponse } from 'next/server';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';

// Configure pdfjs-dist for Node.js environment
pdfjs.GlobalWorkerOptions.workerSrc = undefined; // No separate worker file needed

import { parseResume } from '@/lib/resumeParser';
import { getLocaleByCode } from '@/lib/localeService';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
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
      return NextResponse.json({ error: 'Default locale not found' }, { status: 500 });
    }
    const resumeData = parseResume(fullText, locale);
    return NextResponse.json(resumeData);
  } catch (error: any) {
    console.error('Error processing PDF or parsing resume:', error);
    return NextResponse.json({ error: 'Failed to process PDF or parse resume', details: error.message }, { status: 500 });
  }
}