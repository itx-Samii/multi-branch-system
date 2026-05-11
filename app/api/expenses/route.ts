import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let expenses = await readData<any>('expenses.json');
    expenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(expenses);
  } catch (err: any) {
    console.error("Local JSON Expenses GET Error:", err);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const expenses = await readData<any>('expenses.json');
    const newId = await generateId('expenses.json');

    const newExpense = { ...body, id: newId };
    
    expenses.push(newExpense);
    await writeData('expenses.json', expenses);

    return NextResponse.json(newExpense);
  } catch (err: any) {
    console.error("Local JSON Expenses POST Error:", err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let expenses = await readData<any>('expenses.json');
    expenses = expenses.filter((e: any) => e.id.toString() !== id.toString());
    await writeData('expenses.json', expenses);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Local JSON Expenses DELETE Error:", err);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
