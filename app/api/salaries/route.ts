import { NextResponse } from 'next/server';
import { readData, writeData, generateId, getTenantId } from '@/lib/dbHandler';

export const dynamic = 'force-dynamic';

export async function GET() {
  const schoolId = await getTenantId();
  try {
    let salaries = await readData<any>('salaries_history.json', schoolId);
    if (!Array.isArray(salaries)) salaries = [];
    salaries.sort((a: any, b: any) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
    return NextResponse.json(salaries);
  } catch (err: any) {
    console.error(`Local JSON Salaries GET Error for ${schoolId}:`, err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    
    const salaries = await readData<any>('salaries_history.json', schoolId);
    const newId = await generateId('salaries_history.json', schoolId);

    // Look up staff name so it's permanently stored in the salary record
    let staffName = body.staffName || '';
    if (!staffName && body.staffId) {
      const staffList = await readData<any>('staff.json', schoolId);
      const staffMember = staffList.find((s: any) => s.id?.toString() === body.staffId?.toString());
      if (staffMember) staffName = staffMember.name;
    }

    const newSalary = { ...body, id: newId, schoolId, staffName };
    
    salaries.push(newSalary);
    await writeData('salaries_history.json', salaries, schoolId);

    return NextResponse.json(newSalary);
  } catch (err: any) {
    console.error(`Local JSON Salaries POST Error for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to record salary' }, { status: 500 });
  }
}

