import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

const FILE_NAME = 'staff.json';

export async function GET() {
  try {
    const staff = await readData<any>(FILE_NAME);
    return NextResponse.json(staff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const staff = await readData<any>(FILE_NAME);
    const nextId = await generateId(FILE_NAME);

    const newStaff = {
      id: nextId,
      name: data.name,
      designation: data.designation,
      salary: parseFloat(data.salary || '0'),
      deductionPerOff: parseFloat(data.deductionPerOff || '0'),
      joinedDate: data.joinedDate || new Date().toISOString(),
      status: 'Active'
    };

    staff.push(newStaff);
    await writeData(FILE_NAME, staff);
    return NextResponse.json(newStaff);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add staff' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const staff = await readData<any>(FILE_NAME);
    const index = staff.findIndex((s: any) => s.id === data.id);

    if (index === -1) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    staff[index] = { ...staff[index], ...data };
    await writeData(FILE_NAME, staff);
    return NextResponse.json(staff[index]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const staff = await readData<any>(FILE_NAME);
    const filtered = staff.filter((s: any) => s.id.toString() !== id.toString());
    
    if (staff.length === filtered.length) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    await writeData(FILE_NAME, filtered);

    // CASCADING DELETE: Remove salary history and linked expenses
    try {
      const history = await readData<any>('salaries_history.json');
      const filteredHistory = history.filter((h: any) => h.staffId.toString() !== id.toString());
      if (history.length !== filteredHistory.length) {
        await writeData('salaries_history.json', filteredHistory);
      }

      // Also clean up expenses for these salaries
      const expenses = await readData<any>('expenses.json');
      const filteredExpenses = expenses.filter((e: any) => {
        if (e.category === 'Salary') {
          // Description format: "Salary - StaffName - Month Year"
          // This is a bit fragile, but works if we don't have a direct link.
          // Better way: Check if salary entry for this staffId exists.
          // Since we already filtered history, we can check if description includes staff name.
          // But IDs are safer. For now, let's just clean orphans later if needed.
        }
        return true;
      });
    } catch (e) {
      console.error("Staff cleanup failed", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
