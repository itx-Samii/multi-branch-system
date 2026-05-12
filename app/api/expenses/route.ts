import { NextResponse } from 'next/server';
import { getCollection, addDoc, deleteDoc, generateId } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let expenses = await getCollection('expenses');
    expenses.sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return NextResponse.json(expenses);
  } catch (err: any) {
    console.error('Firestore Expenses GET Error:', err);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newId = await generateId('expenses');
    const newExpense = { ...body, id: newId };

    await addDoc('expenses', newExpense);
    return NextResponse.json(newExpense);
  } catch (err: any) {
    console.error('Firestore Expenses POST Error:', err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await deleteDoc('expenses', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Firestore Expenses DELETE Error:', err);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
