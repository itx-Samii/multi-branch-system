import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const search = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '100');

    let fees = await readData<any>('fees.json');

    if (studentId) fees = fees.filter((f: any) => f.studentId === parseInt(studentId));
    
    if (classId && classId !== 'all') {
        if (!isNaN(Number(classId))) {
            fees = fees.filter((f: any) => f.classId === parseInt(classId));
        } else {
            fees = fees.filter((f: any) => f.className === classId);
        }
    }
    
    if (status && status !== 'all') fees = fees.filter((f: any) => f.status === status);
    if (month && month !== 'all') fees = fees.filter((f: any) => f.month === month);
    if (year && year !== 'all') fees = fees.filter((f: any) => f.year === year);

    // Memory filter for search term (case-insensitive substring)
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

    // Apply limit for speed
    if (fees.length > limit) {
      fees = fees.slice(0, limit);
    }

    return NextResponse.json(fees);
  } catch (err: any) {
    console.error("❌ Local JSON FEES_GET_ERROR:", err);
    return NextResponse.json({ error: 'Database connection failed', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, month, year, classId: filterClassId } = body;

    const idsToProcess = studentIds || (body.studentId ? [body.studentId] : null);

    if (!idsToProcess || !Array.isArray(idsToProcess)) {
      return NextResponse.json({ error: 'Invalid students list' }, { status: 400 });
    }
    
    const students = await readData<any>('students.json');
    const studentsMap = new Map();
    students.forEach((s: any) => studentsMap.set(parseInt(s.id), s));

    const fees = await readData<any>('fees.json');
    const maxId = await generateId('fees.json') - 1; // Since generateId returns maxId + 1

    const newVouchers: any[] = [];

    idsToProcess.forEach((sid, index) => {
      const student = studentsMap.get(parseInt(sid));
      if (!student) return;

      const newId = maxId + index + 1;
      const baseAmount = student.monthlyFee || 0;
      const discount = student.discount || 0;
      
      const voucher = {
        id: newId,
        studentId: parseInt(sid),
        studentName: student.name,
        fatherName: student.fatherName,
        admissionNumber: student.admissionNumber,
        className: student.className || `Class ${student.classId}`,
        classId: parseInt(student.classId),
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

    await writeData('fees.json', fees);
    return NextResponse.json({ success: true, count: newVouchers.length });
  } catch (err: any) {
    console.error("❌ Local JSON FEES_POST_ERROR:", err);
    return NextResponse.json({ error: 'Failed to generate vouchers', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, paidTuition, paidAC } = body;

    if (!id) return NextResponse.json({ error: 'Voucher ID required' }, { status: 400 });

    const fees = await readData<any>('fees.json');
    const feeIndex = fees.findIndex((f: any) => f.id.toString() === id.toString());

    if (feeIndex === -1) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    const feeData = fees[feeIndex];
    const totalReceived = (parseFloat(paidTuition) || 0) + (parseFloat(paidAC) || 0);
    const totalDue = (feeData.amount || 0) + (feeData.previousArrears || 0) + (feeData.remainingAnnualCharges || 0);

    let status = 'Unpaid';
    if (totalReceived >= totalDue) status = 'Paid';
    else if (totalReceived > 0) status = 'Partially Paid';

    const updateData = {
      status,
      paymentDate: new Date().toISOString(),
      paidTuition: parseFloat(paidTuition) || 0,
      paidAC: parseFloat(paidAC) || 0,
      totalReceived: totalReceived
    };

    fees[feeIndex] = { ...fees[feeIndex], ...updateData };
    await writeData('fees.json', fees);

    if (parseFloat(paidAC) > 0 && feeData.studentId) {
      const students = await readData<any>('students.json');
      const sIndex = students.findIndex((s: any) => s.id.toString() === feeData.studentId.toString());
      if (sIndex !== -1) {
        const currentPaid = students[sIndex].paidAnnualCharges || 0;
        students[sIndex].paidAnnualCharges = currentPaid + parseFloat(paidAC);
        await writeData('students.json', students);
      }
    }

    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error("❌ Local JSON FEES_PUT_ERROR:", err);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let fees = await readData<any>('fees.json');
    fees = fees.filter((f: any) => f.id.toString() !== id.toString());
    await writeData('fees.json', fees);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Local JSON FEES_DELETE_ERROR:", err);
    return NextResponse.json({ error: 'Failed to reverse fee' }, { status: 500 });
  }
}
