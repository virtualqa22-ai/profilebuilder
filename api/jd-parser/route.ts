
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
    const { text } = await req.json();
    if (!text) {
      const res = NextResponse.json({ error: 'No text provided' }, { status: 400 });
      setSecurityHeaders(res);
      return res;
    }

    // Basic keyword extraction (for now, just split by space and remove common words)
    const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of']);
    const keywords = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !commonWords.has(word));

    const uniqueKeywords = [...new Set(keywords)];

    const res = NextResponse.json({ keywords: uniqueKeywords });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
