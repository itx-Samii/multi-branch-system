import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const classId = searchParams.get('classId') || 'all';

    const allStudents = await readData<any>('students.json');
    const allClasses = await readData<any>('classes.json');

    let filtered = allStudents.filter((s: any) => {
      const nameMatch = (s.name?.toLowerCase() || "").includes(search) || 
                       (s.fatherName?.toLowerCase() || "").includes(search) ||
                       (s.admissionNumber?.toLowerCase() || "").includes(search);
      const classMatch = classId === 'all' || s.classId?.toString() === classId.toString();
      return nameMatch && classMatch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginated = filtered.slice(start, end).map((s: any) => {
      const dbClass = allClasses.find((c: any) => c.id.toString() === s.classId?.toString());
      return {
        ...s,
        className: dbClass ? `${dbClass.name}${dbClass.section ? ` - ${dbClass.section}` : ''}` : s.classId || 'N/A'
      };
    });

    return NextResponse.json({
      students: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    console.error("Local JSON GET Students Error:", err);
    return NextResponse.json({ error: 'Failed to fetch students', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const students = await readData<any>('students.json');
    const newId = await generateId('students.json');
    
    const newStudent = { 
      ...body, 
      id: newId,
      createdAt: new Date().toISOString(),
      paidAnnualCharges: 0 
    };

    students.push(newStudent);
    await writeData('students.json', students);

    return NextResponse.json(newStudent);
  } catch (err: any) {
    console.error("Local JSON POST Student Error:", err);
    return NextResponse.json({ error: 'Failed to create student', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const students = await readData<any>('students.json');
    const sIndex = students.findIndex((s: any) => s.id.toString() === id.toString());
    
    if (sIndex === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const cleanUpdateData = {
      name: updateData.name,
      fatherName: updateData.fatherName,
      monthlyFee: updateData.monthlyFee,
      discount: updateData.discount,
      admissionNumber: updateData.admissionNumber,
      annualCharges: updateData.annualCharges,
      updatedAt: new Date().toISOString()
    };

    Object.keys(cleanUpdateData).forEach(key => {
      if ((cleanUpdateData as any)[key] === undefined) {
        delete (cleanUpdateData as any)[key];
      }
    });
    
    students[sIndex] = { ...students[sIndex], ...cleanUpdateData };
    await writeData('students.json', students);

    // Sync with fees if fee profile or personal info changed
    const syncFields = ['monthlyFee', 'discount', 'annualCharges', 'name', 'fatherName', 'admissionNumber'];
    const changed = syncFields.some(f => updateData[f] !== undefined);
    
    if (changed) {
      const fees = await readData<any>('fees.json');
      let feesModified = false;

      for (let i = 0; i < fees.length; i++) {
        if (fees[i].studentId?.toString() === id.toString() && fees[i].status !== 'Paid') {
          if (updateData.monthlyFee !== undefined || updateData.discount !== undefined) {
            fees[i].baseAmount = updateData.monthlyFee ?? fees[i].baseAmount;
            fees[i].discount = updateData.discount ?? fees[i].discount;
            fees[i].amount = Math.max(0, fees[i].baseAmount - fees[i].discount);
          }
          if (updateData.name !== undefined) fees[i].studentName = updateData.name;
          if (updateData.fatherName !== undefined) fees[i].fatherName = updateData.fatherName;
          if (updateData.admissionNumber !== undefined) fees[i].admissionNumber = updateData.admissionNumber;
          
          feesModified = true;
        }
      }

      if (feesModified) {
        await writeData('fees.json', fees);
      }
    }

    return NextResponse.json({ id, ...cleanUpdateData });
  } catch (err: any) {
    console.error("Local JSON PUT Student Error:", err);
    return NextResponse.json({ error: 'Failed to update student', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Delete student
    let students = await readData<any>('students.json');
    students = students.filter((s: any) => s.id.toString() !== id.toString());
    await writeData('students.json', students);

    // Cascade delete fees
    let fees = await readData<any>('fees.json');
    fees = fees.filter((f: any) => f.studentId?.toString() !== id.toString());
    await writeData('fees.json', fees);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Local JSON DELETE Student Error:", err);
    return NextResponse.json({ error: 'Failed to delete student', details: err.message }, { status: 500 });
  }
}
