import { NextResponse } from 'next/server';
import { getCollection, addDoc, setDoc, deleteDoc, generateId } from '@/lib/firestore';

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

    let fees = await getCollection('fees');

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

    if (search) {
      fees = fees.filter((f: any) => {
        try {
          const sName = (f.studentName || '').toString().toLowerCase();
          const fName = (f.fatherName || '').toString().toLowerCase();
          const admNo = (f.admissionNumber || '').toString().toLowerCase();
          const vId = (f.id || '').toString().toLowerCase();
          return (
            sName.includes(search) ||
            fName.includes(search) ||
            admNo.includes(search) ||
            vId === search
          );
        } catch {
          return false;
        }
      });
    }

    if (fees.length > limit) {
      fees = fees.slice(0, limit);
    }

    return NextResponse.json(fees);
  } catch (err: any) {
    console.error('❌ Firestore FEES_GET_ERROR:', err);
    return NextResponse.json(
      { error: 'Database connection failed', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, month, year } = body;

    const idsToProcess = studentIds || (body.studentId ? [body.studentId] : null);

    if (!idsToProcess || !Array.isArray(idsToProcess)) {
      return NextResponse.json({ error: 'Invalid students list' }, { status: 400 });
    }

    const students = await getCollection('students');
    const studentsMap = new Map();
    students.forEach((s: any) => studentsMap.set(parseInt(s.id), s));

    const nextId = await generateId('fees');
    const newVouchers: any[] = [];

    for (let index = 0; index < idsToProcess.length; index++) {
      const sid = idsToProcess[index];
      const student = studentsMap.get(parseInt(sid));
      if (!student) continue;

      const newId = nextId + index;
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
        month: month || 'Unknown',
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
        remainingAnnualCharges:
          (student.annualCharges || 0) - (student.paidAnnualCharges || 0),
      };

      await addDoc('fees', voucher);
      newVouchers.push(voucher);
    }

    if (newVouchers.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No new vouchers needed.',
      });
    }

    return NextResponse.json({ success: true, count: newVouchers.length });
  } catch (err: any) {
    console.error('❌ Firestore FEES_POST_ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to generate vouchers', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, paidTuition, paidAC } = body;

    if (!id)
      return NextResponse.json({ error: 'Voucher ID required' }, { status: 400 });

    const fees = await getCollection('fees');
    const feeData = fees.find((f: any) => f.id.toString() === id.toString());

    if (!feeData)
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    const totalReceived =
      (parseFloat(paidTuition) || 0) + (parseFloat(paidAC) || 0);
    const totalDue =
      (feeData.amount || 0) +
      (feeData.previousArrears || 0) +
      (feeData.remainingAnnualCharges || 0);

    let status = 'Unpaid';
    if (totalReceived >= totalDue) status = 'Paid';
    else if (totalReceived > 0) status = 'Partially Paid';

    const updateData = {
      status,
      paymentDate: new Date().toISOString(),
      paidTuition: parseFloat(paidTuition) || 0,
      paidAC: parseFloat(paidAC) || 0,
      totalReceived,
    };

    await setDoc('fees', id, { ...feeData, ...updateData });

    // Update paidAnnualCharges on the student record if AC was paid
    if (parseFloat(paidAC) > 0 && feeData.studentId) {
      const students = await getCollection('students');
      const student = students.find(
        (s: any) => s.id.toString() === feeData.studentId.toString()
      );
      if (student) {
        const currentPaid = student.paidAnnualCharges || 0;
        await setDoc('students', feeData.studentId, {
          ...student,
          paidAnnualCharges: currentPaid + parseFloat(paidAC),
        });
      }
    }

    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error('❌ Firestore FEES_PUT_ERROR:', err);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await deleteDoc('fees', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Firestore FEES_DELETE_ERROR:', err);
    return NextResponse.json({ error: 'Failed to reverse fee' }, { status: 500 });
  }
}
