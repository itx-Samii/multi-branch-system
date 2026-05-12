import { NextResponse } from 'next/server';
import { getCollection, addDoc, setDoc, deleteDoc, deleteWhere, generateId } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const classId = searchParams.get('classId') || 'all';

    const [allStudents, allClasses] = await Promise.all([
      getCollection('students'),
      getCollection('classes'),
    ]);

    let filtered = allStudents.filter((s: any) => {
      const nameMatch =
        (s.name?.toLowerCase() || '').includes(search) ||
        (s.fatherName?.toLowerCase() || '').includes(search) ||
        (s.admissionNumber?.toLowerCase() || '').includes(search);
      const classMatch =
        classId === 'all' || s.classId?.toString() === classId.toString();
      return nameMatch && classMatch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    const paginated = filtered.slice(start, end).map((s: any) => {
      const dbClass = allClasses.find(
        (c: any) => c.id.toString() === s.classId?.toString()
      );
      return {
        ...s,
        className: dbClass
          ? `${dbClass.name}${dbClass.section ? ` - ${dbClass.section}` : ''}`
          : s.classId || 'N/A',
      };
    });

    return NextResponse.json({
      students: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('Firestore GET Students Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch students', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newId = await generateId('students');
    const newStudent = {
      ...body,
      id: newId,
      createdAt: new Date().toISOString(),
      paidAnnualCharges: 0,
    };

    await addDoc('students', newStudent);
    return NextResponse.json(newStudent);
  } catch (err: any) {
    console.error('Firestore POST Student Error:', err);
    return NextResponse.json(
      { error: 'Failed to create student', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const allStudents = await getCollection('students');
    const student = allStudents.find((s: any) => s.id.toString() === id.toString());

    if (!student)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const cleanUpdateData: Record<string, any> = {
      name: updateData.name,
      fatherName: updateData.fatherName,
      monthlyFee: updateData.monthlyFee,
      discount: updateData.discount,
      admissionNumber: updateData.admissionNumber,
      annualCharges: updateData.annualCharges,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(cleanUpdateData).forEach((key) => {
      if (cleanUpdateData[key] === undefined) delete cleanUpdateData[key];
    });

    await setDoc('students', id, { ...student, ...cleanUpdateData });

    // Sync unpaid fee vouchers if financial/personal fields changed
    const syncFields = ['monthlyFee', 'discount', 'annualCharges', 'name', 'fatherName', 'admissionNumber'];
    const changed = syncFields.some((f) => updateData[f] !== undefined);

    if (changed) {
      const fees = await getCollection('fees');
      const toUpdate = fees.filter(
        (f: any) => f.studentId?.toString() === id.toString() && f.status !== 'Paid'
      );

      for (const fee of toUpdate) {
        const updatedFee: Record<string, any> = { ...fee };
        if (updateData.monthlyFee !== undefined || updateData.discount !== undefined) {
          updatedFee.baseAmount = updateData.monthlyFee ?? fee.baseAmount;
          updatedFee.discount = updateData.discount ?? fee.discount;
          updatedFee.amount = Math.max(0, updatedFee.baseAmount - updatedFee.discount);
        }
        if (updateData.name !== undefined) updatedFee.studentName = updateData.name;
        if (updateData.fatherName !== undefined) updatedFee.fatherName = updateData.fatherName;
        if (updateData.admissionNumber !== undefined) updatedFee.admissionNumber = updateData.admissionNumber;
        await setDoc('fees', fee.id, updatedFee);
      }
    }

    return NextResponse.json({ id, ...cleanUpdateData });
  } catch (err: any) {
    console.error('Firestore PUT Student Error:', err);
    return NextResponse.json(
      { error: 'Failed to update student', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await Promise.all([
      deleteDoc('students', id),
      deleteWhere('fees', 'studentId', parseInt(id)),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Firestore DELETE Student Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete student', details: err.message },
      { status: 500 }
    );
  }
}
