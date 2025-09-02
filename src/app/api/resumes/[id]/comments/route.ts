import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '@/models/Resume'; // Ensure the model is loaded

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const { field, text, author } = await req.json();
    const resume = await Resume.findById(id);
    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    resume.comments.push({ field, text, author });
    await resume.save();

    return NextResponse.json({ success: true, data: resume.comments });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
