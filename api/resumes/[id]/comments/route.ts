
import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import '@/models/Resume'; // Ensure the model is loaded
function setSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const Resume = mongoose.model('Resume');
  const { id } = params;
  try {
    const { field, text, author } = await req.json();
    const resume = await Resume.findById(id);
    if (!resume) {
      const res = NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
      setSecurityHeaders(res);
      return res;
    }

    resume.comments.push({ field, text, author });
    await resume.save();

    const res = NextResponse.json({ success: true, data: resume.comments });
    setSecurityHeaders(res);
    return res;
  } catch (error) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 400 });
    setSecurityHeaders(res);
    return res;
  }
}
