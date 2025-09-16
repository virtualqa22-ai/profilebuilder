
import { NextResponse } from 'next/server';
import { getLocales } from '@/lib/localeService';

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function GET() {
  try {
    const locales = getLocales();
    const res = NextResponse.json({ success: true, data: locales });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 500 });
    setSecurityHeaders(res);
    return res;
  }
}
