import { NextResponse } from 'next/server';
import { readData, writeData, generateId, getTenantId } from '@/lib/dbHandler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const search = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '10000');

    let fees = await readData<any>('fees.json', schoolId);
    const students = await readData<any>('students.json', schoolId);
    const classes = await readData<any>('classes.json', schoolId);
    const studentsMap = new Map<string, any>();
    students.forEach((s: any) => studentsMap.set(s.id?.toString(), s));
    const classesMap = new Map<string, any>();
    classes.forEach((c: any) => classesMap.set(c.id?.toString(), c));

    fees = fees.map((f: any) => {
      if (!f.studentName && f.studentId) {
        const student = studentsMap.get(f.studentId?.toString());
        if (student) {
          const cls = classesMap.get(student.classId?.toString());
          f.studentName = student.name;
          f.fatherName = student.fatherName;
          f.admissionNumber = student.admissionNumber;
          f.className = cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : `Class ${student.classId}`;
          f.classId = student.classId?.toString();
        }
      }
      return f;
    });

    if (studentId) fees = fees.filter((f: any) => f.studentId?.toString() === studentId.toString());
    
    if (classId && classId !== 'all') {
        fees = fees.filter((f: any) => f.classId?.toString() === classId.toString());
    }
    
    if (status && status !== 'all') fees = fees.filter((f: any) => f.status === status);
    if (month && month !== 'all') fees = fees.filter((f: any) => f.month === month);
    if (year && year !== 'all') fees = fees.filter((f: any) => f.year === year);

    if (search) {
        fees = fees.filter((f: any) => {
            try {
                const sName = (f.studentName || "").toString().toLowerCase();
                const fName = (f.fatherName || "").toString().toLowerCase();
                const admNo = (f.admissionNumber || "").toString().toLowerCase();
                const vId = (f.id || "").toString().toLowerCase();
                
                return sName.includes(search) || 
                       fName.includes(search) || 
                       admNo.includes(search) || 
                       vId === search;
            } catch (e) {
                return false;
            }
        });
    }

    if (fees.length > limit) {
      fees = fees.slice(0, limit);
    }

    return NextResponse.json(fees);
  } catch (err: any) {
    console.error(`❌ Local JSON FEES_GET_ERROR for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Database connection failed', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { studentIds, month, year, classId: filterClassId } = body;

    let idsToProcess = studentIds || (body.studentId ? [body.studentId] : null);
    
    if (!idsToProcess || !Array.isArray(idsToProcess)) {
      const allStudents = await readData<any>('students.json', schoolId);
      idsToProcess = allStudents.map((s: any) => s.id);
    }
    
    const students = await readData<any>('students.json', schoolId);
    const studentsMap = new Map();
    students.forEach((s: any) => studentsMap.set(s.id?.toString(), s));

    const classes = await readData<any>('classes.json', schoolId);
    const classesMap = new Map();
    classes.forEach((c: any) => classesMap.set(c.id?.toString(), c));

    const fees = await readData<any>('fees.json', schoolId);
    const maxId = (await generateId('fees.json', schoolId)) - 1;

    const newVouchers: any[] = [];

    idsToProcess.forEach((sid: any) => {
      const student = studentsMap.get(sid?.toString());
      if (!student) return;

      const exists = fees.some((f: any) =>
        f.studentId?.toString() === sid?.toString() &&
        f.month === (month || "Unknown") &&
        f.year === (year || new Date().getFullYear().toString())
      );
      if (exists) return;

      const newId = maxId + newVouchers.length + 1;
      const baseAmount = student.monthlyFee || 0;
      const discount = student.discount || 0;
      
      const classObj = classesMap.get(student.classId?.toString());
      const resolvedClassName = classObj
        ? `${classObj.name}${classObj.section ? ' - ' + classObj.section : ''}`
        : `Class ${student.classId}`;

      const voucher = {
        id: newId,
        studentId: sid?.toString(),
        schoolId,
        studentName: student.name,
        fatherName: student.fatherName,
        admissionNumber: student.admissionNumber,
        className: resolvedClassName,
        classId: student.classId?.toString(),
        month: month || "Unknown",
        year: year || new Date().getFullYear().toString(),
        amount: Math.max(0, baseAmount - discount),
        baseAmount,
        discount,
        status: 'Unpaid',
        issueDate: new Date().toISOString(),
        paymentDate: null,
        totalReceived: 0,
        paidTuition: 0,
        paidAC: 0,
        previousArrears: 0,
        remainingAnnualCharges: (student.annualCharges || 0) - (student.paidAnnualCharges || 0)
      };

      fees.push(voucher);
      newVouchers.push(voucher);
    });

    if (newVouchers.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No new vouchers needed." });
    }

    await writeData('fees.json', fees, schoolId);
    return NextResponse.json({ success: true, count: newVouchers.length });
  } catch (err: any) {
    console.error(`❌ Local JSON FEES_POST_ERROR for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to generate vouchers', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { id, paidTuition, paidAC } = body;

    if (!id) return NextResponse.json({ error: 'Voucher ID required' }, { status: 400 });

    const fees = await readData<any>('fees.json', schoolId);
    const feeIndex = fees.findIndex((f: any) => f.id.toString() === id.toString());

    if (feeIndex === -1) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    const feeData = fees[feeIndex];
    
    const newPaidTuition = parseFloat(paidTuition) || 0;
    const newPaidAC = parseFloat(paidAC) || 0;
    
    const updatedPaidTuition = (feeData.paidTuition || 0) + newPaidTuition;
    const updatedPaidAC = (feeData.paidAC || 0) + newPaidAC;
    const totalReceived = updatedPaidTuition + updatedPaidAC;

    const totalDue = (feeData.amount || 0) + (feeData.previousArrears || 0) + (feeData.remainingAnnualCharges || 0);

    let status = 'Unpaid';
    if (totalReceived >= totalDue) status = 'Paid';
    else if (totalReceived > 0) status = 'Partially Paid';

    const updateData = {
      status,
      paymentDate: new Date().toISOString(),
      paidTuition: updatedPaidTuition,
      paidAC: updatedPaidAC,
      totalReceived: totalReceived
    };

    fees[feeIndex] = { ...fees[feeIndex], ...updateData };
    await writeData('fees.json', fees, schoolId);

    if (parseFloat(paidAC) > 0 && feeData.studentId) {
      const students = await readData<any>('students.json', schoolId);
      const sIndex = students.findIndex((s: any) => s.id.toString() === feeData.studentId.toString());
      if (sIndex !== -1) {
        const currentPaid = students[sIndex].paidAnnualCharges || 0;
        students[sIndex].paidAnnualCharges = currentPaid + parseFloat(paidAC);
        await writeData('students.json', students, schoolId);
      }
    }

    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error(`❌ Local JSON FEES_PUT_ERROR for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let fees = await readData<any>('fees.json', schoolId);
    fees = fees.filter((f: any) => f.id.toString() !== id.toString());
    await writeData('fees.json', fees, schoolId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`❌ Local JSON FEES_DELETE_ERROR for ${schoolId}:`, err);
    return NextResponse.json({ error: 'Failed to reverse fee' }, { status: 500 });
  }
}
