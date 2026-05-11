import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let salaries = await readData<any>('salaries_history.json');
    // Sort by paymentDate desc
    salaries.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return NextResponse.json(salaries);
  } catch (err: any) {
    console.error("Local JSON Salaries GET Error:", err);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const salaries = await readData<any>('salaries_history.json');
    const newId = await generateId('salaries_history.json');

    const newSalary = { ...body, id: newId };
    
    salaries.push(newSalary);
    await writeData('salaries_history.json', salaries);

    return NextResponse.json(newSalary);
  } catch (err: any) {
    console.error("Local JSON Salaries POST Error:", err);
    return NextResponse.json({ error: 'Failed to record salary' }, { status: 500 });
  }
}
