import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile } from 'fs/promises';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    const res = NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = join(process.cwd(), 'public', 'uploads', fileName);
  await writeFile(filePath, buffer);
  const fileUrl = `/uploads/${fileName}`;
  const res = NextResponse.json({ success: true, url: fileUrl });
  setSecurityHeaders(res);
  return res;
}

function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}
