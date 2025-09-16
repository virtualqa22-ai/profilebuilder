
import { NextResponse } from 'next/server';

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function POST(req: Request) {
  try {
    const { coverLetterContent } = await req.json();

    // Placeholder for DOCX generation logic
    // This will involve using a library like `docx` to create a .docx file.
    console.log('Generating DOCX for:', coverLetterContent);

    const res = NextResponse.json({ message: 'DOCX generation initiated (placeholder)' });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
