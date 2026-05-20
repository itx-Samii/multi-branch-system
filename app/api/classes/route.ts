import { NextResponse } from 'next/server';
import { readData, writeData, generateId, getTenantId, getTenantBranchId } from '@/lib/dbHandler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const sessionBranchId = await getTenantBranchId();
    let branchId = sessionBranchId || searchParams.get('branchId') || 'all';

    const branches = await readData<any>('branches.json', schoolId);
    const defaultBranch = branches.find((b: any) => b.isDefault);
    const defaultBranchId = defaultBranch ? (defaultBranch.branchId || defaultBranch.id) : 'branch_main';
    const isDefaultRequested = branchId === defaultBranchId || branchId === 'branch_main';

    const classes = await readData<any>('classes.json', schoolId);
    const students = await readData<any>('students.json', schoolId);

    const filteredClasses = branchId === 'all'
      ? classes
      : classes.filter((c: any) => {
          const cb = c.branchId || 'branch_main';
          if (isDefaultRequested && (cb === 'branch_main' || !c.branchId)) return true;
          return cb === branchId;
        });

    const processedClasses = filteredClasses.map((c: any) => ({
      ...c,
      branchId: c.branchId || 'branch_main',
      studentCount: students.filter((s: any) => {
        if (s.classId?.toString() !== c.id?.toString()) return false;
        if (branchId === 'all') return true;
        const sb = s.branchId || 'branch_main';
        if (isDefaultRequested && (sb === 'branch_main' || !s.branchId)) return true;
        return sb === branchId;
      }).length
    }));

    const response = NextResponse.json(processedClasses);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (err: any) {
    console.error(`Local JSON Classes GET Error for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to fetch classes', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { name, section, monthlyFee, annualCharges } = body;

    const classes = await readData<any>('classes.json', schoolId);
    const newId = await generateId('classes.json', schoolId);

    const newClass = {
      id: newId,
      schoolId,
      branchId: body.branchId || 'branch_main', // 🏛️ Branch isolation
      name,
      section,
      monthlyFee: parseFloat(monthlyFee),
      annualCharges: parseFloat(annualCharges || 0)
    };

    classes.push(newClass);
    await writeData('classes.json', classes, schoolId);

    return NextResponse.json(newClass);
  } catch (err: any) {
    console.error(`Local JSON Classes POST Error for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to create class', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const classes = await readData<any>('classes.json', schoolId);
    const classIndex = classes.findIndex((c: any) => c.id.toString() === id.toString());
    
    if (classIndex === -1) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    classes[classIndex] = { ...classes[classIndex], ...updateData };
    await writeData('classes.json', classes, schoolId);

    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error(`Local JSON Classes PUT Error for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to update class', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let classes = await readData<any>('classes.json', schoolId);
    classes = classes.filter((c: any) => c.id.toString() !== id.toString());
    await writeData('classes.json', classes, schoolId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`Local JSON Classes DELETE Error for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to delete class', details: err.message }, { status: 500 });
  }
}
