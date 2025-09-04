import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile } from 'fs/promises';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = join(process.cwd(), 'public', 'uploads', fileName);
  await writeFile(filePath, buffer);
  const fileUrl = `/uploads/${fileName}`;
  return NextResponse.json({ success: true, url: fileUrl });
}
