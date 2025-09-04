import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function GET(req: Request, { params }: { params: { locale: string } }) {
  const { locale } = params;
  try {
    const filePath = path.join(process.cwd(), 'src', 'locales', `${locale}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const schema = JSON.parse(fileContent);
    const res = NextResponse.json({ success: true, data: schema });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    // If the file doesn't exist, we can return a default schema or an error
    const res = NextResponse.json({ success: false, error: `Locale schema for '${locale}' not found` }, { status: 404 });
    setSecurityHeaders(res);
    return res;
  }
}
