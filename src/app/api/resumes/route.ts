import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '@/models/Resume'; // Ensure the model is loaded

export async function GET() {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  try {
    const resumes = await Resume.find({});
    return NextResponse.json({ success: true, data: resumes });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  try {
    const body = await req.json();
    const resume = await Resume.create(body);
    return NextResponse.json({ success: true, data: resume }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}