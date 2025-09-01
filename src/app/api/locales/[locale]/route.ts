import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(req: Request, { params }: { params: { locale: string } }) {
  const { locale } = params;
  try {
    const filePath = path.join(process.cwd(), 'src', 'locales', `${locale}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const schema = JSON.parse(fileContent);
    return NextResponse.json({ success: true, data: schema });
  } catch (error) {
    // If the file doesn't exist, we can return a default schema or an error
    return NextResponse.json({ success: false, error: `Locale schema for '${locale}' not found` }, { status: 404 });
  }
}
