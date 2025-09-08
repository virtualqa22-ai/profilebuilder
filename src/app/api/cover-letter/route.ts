
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
    const {  } = await req.json(); // Expecting cover letter data and template choice

    // Placeholder for cover letter generation logic
    // This will involve selecting a template and populating it with user data

    const res = NextResponse.json({ message: 'Cover letter generation initiated (placeholder)' });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}

export async function GET() {
  try {
    // Placeholder for fetching available cover letter templates
    const templates = [
      { id: 'classic', name: 'Classic Template' },
      { id: 'modern', name: 'Modern Template' },
    ];

    const res = NextResponse.json({ templates });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
