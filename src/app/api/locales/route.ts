import { NextResponse } from 'next/server';
import { getLocales } from '@/lib/localeService';

export async function GET() {
  try {
    const locales = getLocales();
    return NextResponse.json({ success: true, data: locales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
