import { NextResponse } from 'next/server';
import { getCacheManager, CacheKeys } from '@/backend/lib/cacheManager';

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

    const cacheManager = getCacheManager();
    const cacheKey = CacheKeys.jdKeywords(text);

    // Try to get cached keywords first
    let keywords = await cacheManager.get<string[]>(cacheKey);

    if (!keywords) {
      // Cache miss - perform keyword extraction
      const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of']);
      const extractedKeywords = text
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !commonWords.has(word));

      keywords = [...new Set(extractedKeywords)];

      // Cache the result with configured TTL
      const CACHE_CONFIG = (cacheManager as any).CACHE_CONFIG || { JD_PARSER_TTL: 3600 };
      await cacheManager.set(cacheKey, keywords, CACHE_CONFIG.JD_PARSER_TTL);
    }

    const res = NextResponse.json({ keywords });
    setSecurityHeaders(res);
    return res;
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
