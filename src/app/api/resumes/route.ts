import dbConnect from '@/lib/dbConnect';
import Resume from '@/models/Resume';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const resumes = await Resume.find({}).populate('locale');
    return NextResponse.json({ success: true, data: resumes });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const resume = await Resume.create(body);
    return NextResponse.json({ success: true, data: resume }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
