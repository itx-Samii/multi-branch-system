import { NextResponse } from 'next/server';
import { getCollection, addDoc, generateId } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let salaries = await getCollection('salaries_history');
    salaries.sort(
      (a: any, b: any) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    return NextResponse.json(salaries);
  } catch (err: any) {
    console.error('Firestore Salaries GET Error:', err);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newId = await generateId('salaries_history');
    const newSalary = { ...body, id: newId };

    await addDoc('salaries_history', newSalary);
    return NextResponse.json(newSalary);
  } catch (err: any) {
    console.error('Firestore Salaries POST Error:', err);
    return NextResponse.json({ error: 'Failed to record salary' }, { status: 500 });
  }
}
