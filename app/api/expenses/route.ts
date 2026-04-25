import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

const FILE_NAME = 'expenses.json';

export async function GET(request: Request) {
  try {
    const expenses = await readData<any>(FILE_NAME);
    return NextResponse.json(expenses);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expenses = await readData<any>(FILE_NAME);
    const id = await generateId(FILE_NAME);
    
    const newExpense = { 
      id, 
      category: body.category,
      amount: parseFloat(body.amount) || 0,
      description: body.description,
      date: body.date || new Date().toISOString()
    };
    
    expenses.push(newExpense);
    await writeData(FILE_NAME, expenses);
    
    return NextResponse.json(newExpense);
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID missing' }, { status: 400 });

    const expenses = await readData<any>(FILE_NAME);
    const filtered = expenses.filter((e: any) => e.id.toString() !== id.toString());
    await writeData(FILE_NAME, filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
