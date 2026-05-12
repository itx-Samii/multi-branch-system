import { NextResponse } from 'next/server';
import { getCollection, addDoc, setDoc, deleteDoc, deleteWhere, generateId } from '@/lib/firestore';

const COLLECTION = 'staff';

export async function GET() {
  try {
    const staff = await getCollection(COLLECTION);
    return NextResponse.json(staff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const nextId = await generateId(COLLECTION);

    const newStaff = {
      id: nextId,
      name: data.name,
      designation: data.designation,
      salary: parseFloat(data.salary || '0'),
      deductionPerOff: parseFloat(data.deductionPerOff || '0'),
      joinedDate: data.joinedDate || new Date().toISOString(),
      status: 'Active',
    };

    await addDoc(COLLECTION, newStaff);
    return NextResponse.json(newStaff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add staff' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const staff = await getCollection(COLLECTION);
    const existing = staff.find((s: any) => s.id === data.id);

    if (!existing)
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    const updated = { ...existing, ...data };
    await setDoc(COLLECTION, data.id, updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const staff = await getCollection(COLLECTION);
    const existing = staff.find((s: any) => s.id.toString() === id.toString());

    if (!existing)
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    // Delete staff + cascade salary history
    await Promise.all([
      deleteDoc(COLLECTION, id),
      deleteWhere('salaries_history', 'staffId', parseInt(id)),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
