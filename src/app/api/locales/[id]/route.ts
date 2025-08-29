import dbConnect from '@/lib/dbConnect';
import Locale from '@/models/Locale';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  try {
    const locale = await Locale.findById(id);
    if (!locale) {
      return NextResponse.json({ success: false, error: 'Locale not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: locale });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  try {
    const body = await req.json();
    const locale = await Locale.findByIdAndUpdate(id, body, { 
      new: true,
      runValidators: true,
    });
    if (!locale) {
      return NextResponse.json({ success: false, error: 'Locale not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: locale });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  try {
    const deletedLocale = await Locale.deleteOne({ _id: id });
    if (!deletedLocale.deletedCount) {
      return NextResponse.json({ success: false, error: 'Locale not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
