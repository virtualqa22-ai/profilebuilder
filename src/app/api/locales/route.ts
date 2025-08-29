import dbConnect from '@/lib/dbConnect';
import Locale from '@/models/Locale';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const locales = await Locale.find({});
    return NextResponse.json({ success: true, data: locales });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const locale = await Locale.create(body);
    return NextResponse.json({ success: true, data: locale }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
