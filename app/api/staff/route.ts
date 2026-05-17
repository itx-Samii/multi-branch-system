import { NextResponse } from 'next/server';
import { readData, writeData, generateId, getTenantId } from '@/lib/dbHandler';

const FILE_NAME = 'staff.json';

export async function GET() {
  const schoolId = await getTenantId();
  try {
    const staff = await readData<any>(FILE_NAME, schoolId);
    return NextResponse.json(staff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const schoolId = await getTenantId();
  try {
    const data = await request.json();
    const staff = await readData<any>(FILE_NAME, schoolId);
    const nextId = await generateId(FILE_NAME, schoolId);

    const newStaff = {
      id: nextId,
      schoolId,
      name: data.name,
      designation: data.designation,
      salary: parseFloat(data.salary || '0'),
      deductionPerOff: parseFloat(data.deductionPerOff || '0'),
      joinedDate: data.joinedDate || new Date().toISOString(),
      status: 'Active'
    };

    staff.push(newStaff);
    await writeData(FILE_NAME, staff, schoolId);
    return NextResponse.json(newStaff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add staff' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const schoolId = await getTenantId();
  try {
    const data = await request.json();
    const staff = await readData<any>(FILE_NAME, schoolId);
    const index = staff.findIndex((s: any) => s.id?.toString() === data.id?.toString());

    if (index === -1) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    const updatedStaff = {
      ...staff[index],
      ...data,
      salary: data.salary !== undefined ? parseFloat(data.salary) : staff[index].salary,
      deductionPerOff: data.deductionPerOff !== undefined ? parseFloat(data.deductionPerOff) : staff[index].deductionPerOff
    };
    staff[index] = updatedStaff;
    await writeData(FILE_NAME, staff, schoolId);
    return NextResponse.json(updatedStaff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const staff = await readData<any>(FILE_NAME, schoolId);
    const filtered = staff.filter((s: any) => s.id.toString() !== id.toString());
    
    if (staff.length === filtered.length) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    await writeData(FILE_NAME, filtered, schoolId);

    try {
      const history = await readData<any>('salaries_history.json', schoolId);
      const filteredHistory = history.filter((h: any) => h.staffId.toString() !== id.toString());
      if (history.length !== filteredHistory.length) {
        await writeData('salaries_history.json', filteredHistory, schoolId);
      }

      const expenses = await readData<any>('expenses.json', schoolId);
      const filteredExpenses = expenses.filter((e: any) => {
        if (e.category === 'Salary') {
          const targetStaff = staff.find((s: any) => s.id.toString() === id.toString());
          if (targetStaff && e.description?.includes(targetStaff.name)) return false;
        }
        return true;
      });
      if (expenses.length !== filteredExpenses.length) {
        await writeData('expenses.json', filteredExpenses, schoolId);
      }
    } catch (e) {
      console.error("Staff cleanup failed", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
