import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Basic keyword extraction (for now, just split by space and remove common words)
    const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of']);
    const keywords = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !commonWords.has(word));

    const uniqueKeywords = [...new Set(keywords)];

    return NextResponse.json({ keywords: uniqueKeywords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
