import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

const FILE_NAME = 'students.json';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const classIdFilter = searchParams.get('classId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const allStudents = await readData<any>(FILE_NAME);
    const allClasses = await readData<any>('classes.json').catch(() => []);
    
    let filtered = allStudents;
    
    // Server side filtering by class
    if (classIdFilter) {
      filtered = filtered.filter((s: any) => s.classId?.toString() === classIdFilter);
    }

    // Server side search filtering
    filtered = search ? 
      filtered.filter((s: any) => 
        s.name.toLowerCase().includes(search) || 
        s.fatherName?.toLowerCase().includes(search) ||
        s.rollNumber?.toLowerCase().includes(search)
      ) : filtered;

    // Server side pagination
    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end).map((s: any) => {
      // If classId is a database integer, find the class
      const dbClass = allClasses.find((c: any) => c.id.toString() === s.classId?.toString());
      return {
        ...s,
        className: dbClass ? `${dbClass.name}${dbClass.section ? ` - ${dbClass.section}` : ''}` : s.classId
      };
    });

    return NextResponse.json({
      data: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const allStudents = await readData<any>(FILE_NAME);
    const id = await generateId(FILE_NAME);
    
    const newStudent = { id, ...body, createdAt: new Date().toISOString() };
    allStudents.push(newStudent);
    
    await writeData(FILE_NAME, allStudents);
    return NextResponse.json(newStudent);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let students = await readData<any>(FILE_NAME);
    const index = students.findIndex((s: any) => s.id.toString() === body.id.toString());
    
    if (index === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Capture old data to see if fee related fields changed
    const oldStudent = students[index];
    students[index] = { ...students[index], ...body, updatedAt: new Date().toISOString() };
    await writeData(FILE_NAME, students);

    // AUTO-SYNC: If fee or discount changed, update active unpaid vouchers
    if (body.monthlyFee !== undefined || body.discount !== undefined || body.annualCharges !== undefined) {
      const fees = await readData<any>('fees.json');
      let feeChanged = false;
      
      const updatedFees = fees.map((f: any) => {
        if (f.studentId.toString() === body.id.toString() && f.status === 'Unpaid') {
          feeChanged = true;
          // Recalculate net amount
          const base = body.monthlyFee ?? f.baseAmount;
          const disc = body.discount ?? f.discount;
          return {
            ...f,
            baseAmount: base,
            discount: disc,
            amount: base - disc,
            remainingAnnualCharges: body.annualCharges !== undefined ? (body.annualCharges - (f.paidAC || 0)) : f.remainingAnnualCharges
          };
        }
        return f;
      });

      if (feeChanged) {
        await writeData('fees.json', updatedFees);
      }
    }
    
    return NextResponse.json(students[index]);
  } catch (err) {
    console.error("PUT Update Error:", err);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let students = await readData<any>(FILE_NAME);
    const initialLength = students.length;
    students = students.filter((s: any) => s.id.toString() !== id);
    
    if (students.length === initialLength) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await writeData(FILE_NAME, students);

    // CASCADING DELETE: Remove all fees associated with this student
    try {
      const fees = await readData<any>('fees.json');
      const updatedFees = fees.filter((f: any) => f.studentId.toString() !== id.toString());
      if (fees.length !== updatedFees.length) {
        await writeData('fees.json', updatedFees);
      }
    } catch (e) {
      console.error("Cleanup fees failed", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
