import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

const FILE_NAME = 'fees.json';
const STUDENTS_FILE = 'students.json';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const fees = await readData<any>(FILE_NAME);
    const students = await readData<any>(STUDENTS_FILE);
    const classes = await readData<any>('classes.json').catch(() => []);
    
    let filtered = fees;
    if (month && year) {
      filtered = filtered.filter((f: any) => f.month === month && f.year === year);
    }

    const enriched = filtered.map((f: any) => {
      const student = students.find((s: any) => s.id === f.studentId);
      const studentClass = student?.classId ? classes.find((c: any) => c.id.toString() === student.classId.toString()) : null;
      const classDisplay = studentClass ? `${studentClass.name}${studentClass.section ? ` - ${studentClass.section}` : ''}` : student?.classId || 'N/A';
      return {
        ...f,
        studentName: student?.name || 'Unknown',
        fatherName: student?.fatherName || 'N/A',
        rollNumber: student?.rollNumber || 'N/A',
        classId: student?.classId || 'N/A',
        className: classDisplay,
        totalAnnualCharges: student?.annualCharges || 0,
        paidAnnualCharges: student?.paidAnnualCharges || 0,
        remainingAnnualCharges: (student?.annualCharges || 0) - (student?.paidAnnualCharges || 0)
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // CASE 1: Standalone AC Payment (from AC Ledger)
    if (body.isACOnly) {
      const { studentId, amount, paymentDate } = body;
      const students = await readData<any>(STUDENTS_FILE);
      const studentIndex = students.findIndex((s: any) => s.id === studentId);
      
      if (studentIndex === -1) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      
      // Update student balance
      students[studentIndex].paidAnnualCharges = (students[studentIndex].paidAnnualCharges || 0) + parseFloat(amount);
      await writeData(STUDENTS_FILE, students);

      // Create transaction record
      const allFees = await readData<any>(FILE_NAME);
      const nextId = await generateId(FILE_NAME);
      const newRecord = {
        id: nextId,
        studentId,
        month: 'Annual Charges',
        year: new Date(paymentDate || Date.now()).getFullYear().toString(),
        baseAmount: 0,
        discount: 0,
        amount: 0, 
        paidTuition: 0,
        paidAC: parseFloat(amount),
        totalReceived: parseFloat(amount),
        status: 'Paid',
        issueDate: new Date().toISOString(),
        paymentDate: paymentDate || new Date().toISOString(),
        note: 'Direct AC Payment'
      };
      
      allFees.push(newRecord);
      await writeData(FILE_NAME, allFees);
      return NextResponse.json(newRecord);
    }

    // CASE 2: Batch Monthly Generation
    const { month, year } = body;
    if (!month || !year) return NextResponse.json({ error: 'Month and year required' }, { status: 400 });

    const allStudents = await readData<any>(STUDENTS_FILE);
    const allFees = await readData<any>(FILE_NAME);
    let nextId = await generateId(FILE_NAME);
    
    let generatedCount = 0;

    for (const student of allStudents) {
      if (student.status !== 'Active') continue;

      // Check if fee already exists
      const exists = allFees.find((f: any) => f.studentId === student.id && f.month === month && f.year === year);
      if (!exists) {
        const netAmount = (student.monthlyFee || 0) - (student.discount || 0);

        allFees.push({
          id: nextId++,
          studentId: student.id,
          month,
          year,
          baseAmount: student.monthlyFee || 0,
          discount: student.discount || 0,
          amount: netAmount > 0 ? netAmount : 0,
          status: 'Unpaid',
          issueDate: new Date().toISOString(),
          paymentDate: null
        });
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      await writeData(FILE_NAME, allFees);
    }
    
    return NextResponse.json({ success: true, count: generatedCount });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, paidTuition, paidAC } = await request.json();
    if (!id) return NextResponse.json({ error: 'Voucher ID missing' }, { status: 400 });

    const allFees = await readData<any>(FILE_NAME);
    const feeIndex = allFees.findIndex((f: any) => f.id === id);
    
    if (feeIndex === -1) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    const feeRecord = allFees[feeIndex];

    // Update Student AC Balance
    const students = await readData<any>(STUDENTS_FILE);
    const studentIndex = students.findIndex((s: any) => s.id === feeRecord.studentId);
    
    if (studentIndex !== -1) {
      const acAmount = parseFloat(paidAC || '0');
      students[studentIndex].paidAnnualCharges = (students[studentIndex].paidAnnualCharges || 0) + acAmount;
      await writeData(STUDENTS_FILE, students);
    }

    allFees[feeIndex].status = 'Paid';
    allFees[feeIndex].paymentDate = new Date().toISOString();
    allFees[feeIndex].paidTuition = parseFloat(paidTuition || feeRecord.amount);
    allFees[feeIndex].paidAC = parseFloat(paidAC || '0');
    allFees[feeIndex].totalReceived = (allFees[feeIndex].paidTuition) + (allFees[feeIndex].paidAC);

    await writeData(FILE_NAME, allFees);
    
    return NextResponse.json(allFees[feeIndex]);
  } catch (err) {
    return NextResponse.json({ error: 'System Error processing payment' }, { status: 500 });
  }
}

