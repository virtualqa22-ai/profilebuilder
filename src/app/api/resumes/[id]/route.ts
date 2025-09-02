import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '@/models/Resume'; // Ensure the model is loaded

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const resume = await Resume.findById(id);
    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const body = await req.json();
    const resume = await Resume.findByIdAndUpdate(
      id,
      { ...body, $inc: { version: 1 } },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const deletedResume = await Resume.deleteOne({ _id: id });
    if (!deletedResume.deletedCount) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}