import { NextResponse } from 'next/server';
import { getCollection, addDoc, setDoc, deleteDoc, generateId } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const classes = await getCollection('classes');
    const processedClasses = classes.map((c: any) => ({
      ...c,
      studentCount: 0,
    }));
    return NextResponse.json(processedClasses);
  } catch (err: any) {
    console.error('Firestore Classes GET Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch classes', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, section, monthlyFee, annualCharges } = body;

    const newId = await generateId('classes');
    const newClass = {
      id: newId,
      name,
      section,
      monthlyFee: parseFloat(monthlyFee),
      annualCharges: parseFloat(annualCharges || 0),
    };

    await addDoc('classes', newClass);
    return NextResponse.json(newClass);
  } catch (err: any) {
    console.error('Firestore Classes POST Error:', err);
    return NextResponse.json(
      { error: 'Failed to create class', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const classes = await getCollection('classes');
    const existing = classes.find((c: any) => c.id.toString() === id.toString());

    if (!existing)
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    await setDoc('classes', id, { ...existing, ...updateData });
    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error('Firestore Classes PUT Error:', err);
    return NextResponse.json(
      { error: 'Failed to update class', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await deleteDoc('classes', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Firestore Classes DELETE Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete class', details: err.message },
      { status: 500 }
    );
  }
}
