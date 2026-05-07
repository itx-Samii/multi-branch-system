import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  writeBatch,
  orderBy
} from 'firebase/firestore';

// --- TypeScript Interfaces ---
interface FeeRecord {
  id: number;
  studentId: number;
  month: string;
  year: string;
  baseAmount: number;
  discount: number;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  previousArrears?: number;
  issueDate: string;
  paymentDate: string | null;
  paidTuition?: number;
  paidAC?: number;
  totalReceived?: number;
  isACOnly?: boolean;
  note?: string;
}

interface Student {
  id: number;
  name: string;
  fatherName: string;
  admissionNumber?: string;
  classId: string;
  monthlyFee: number;
  discount: number;
  annualCharges: number;
  paidAnnualCharges: number;
  status: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Fetch all required data from Firebase
    const feesSnap = await getDocs(collection(db, 'fees'));
    let allFees: any[] = [];
    feesSnap.forEach(doc => allFees.push({ ...doc.data(), id: parseInt(doc.id) }));

    const studentsSnap = await getDocs(collection(db, 'students'));
    let allStudents: any[] = [];
    studentsSnap.forEach(doc => allStudents.push({ ...doc.data() }));

    const classesSnap = await getDocs(collection(db, 'classes'));
    let allClasses: any[] = [];
    classesSnap.forEach(doc => allClasses.push({ ...doc.data() }));
    
    let filtered = allFees;
    if (month && year) {
      filtered = filtered.filter((f) => f.month === month && f.year === year);
    }

    const enriched = filtered.map((f) => {
      const student = allStudents.find((s) => s.id === f.studentId);
      const studentClass = student?.classId ? allClasses.find((c) => c.id.toString() === student.classId.toString()) : null;
      const classDisplay = studentClass ? `${studentClass.name}${studentClass.section ? ` - ${studentClass.section}` : ''}` : student?.classId || 'N/A';
      
      // Dynamic Arrears Calculation (Live balance from other unpaid vouchers)
      const dynamicArrears = allFees
        .filter(prev => 
          prev.studentId === f.studentId && 
          prev.id !== f.id && 
          prev.status !== 'Paid' && 
          prev.month !== 'Annual Charges'
        )
        .reduce((sum, prev) => {
          const due = (prev.amount || 0) - (prev.paidTuition || 0);
          return sum + (due > 0 ? due : 0);
        }, 0);

      return {
        ...f,
        previousArrears: dynamicArrears,
        studentName: student?.name || 'Unknown',
        fatherName: student?.fatherName || 'N/A',
        admissionNumber: student?.admissionNumber || 'N/A',
        rollNumber: (student as any)?.rollNumber || 'N/A',
        classId: student?.classId || 'N/A',
        className: classDisplay,
        totalAnnualCharges: student?.annualCharges || 0,
        paidAnnualCharges: student?.paidAnnualCharges || 0,
        remainingAnnualCharges: (student?.annualCharges || 0) - (student?.paidAnnualCharges || 0)
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Firebase GET Fees Error:", err);
    return NextResponse.json({ error: 'Failed to fetch fees from cloud' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // CASE 1: Standalone AC Payment
    if (body.isACOnly) {
      const { studentId, amount, paymentDate } = body;
      if (!studentId) return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });

      const studentRef = doc(db, 'students', studentId.toString());
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      
      const student = studentSnap.data() as Student;
      await updateDoc(studentRef, {
        paidAnnualCharges: (student.paidAnnualCharges || 0) + parseFloat(amount)
      });

      const feesSnap = await getDocs(collection(db, 'fees'));
      let maxId = 0;
      feesSnap.forEach(doc => { if (parseInt(doc.id) > maxId) maxId = parseInt(doc.id); });
      const nextId = maxId + 1;

      const newRecord: FeeRecord = {
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
      
      await setDoc(doc(db, 'fees', nextId.toString()), newRecord);
      return NextResponse.json(newRecord);
    }

    // CASE 2: Batch Monthly Generation
    const { month, year, classId } = body;
    if (!month || !year) return NextResponse.json({ error: 'Month and year required' }, { status: 400 });

    const studentsSnap = await getDocs(collection(db, 'students'));
    const feesSnap = await getDocs(collection(db, 'fees'));
    
    let allFees: any[] = [];
    feesSnap.forEach(doc => allFees.push(doc.data()));
    let maxId = 0;
    feesSnap.forEach(doc => { if (parseInt(doc.id) > maxId) maxId = parseInt(doc.id); });
    let nextId = maxId + 1;

    const batch = writeBatch(db);
    let generatedCount = 0;

    studentsSnap.forEach((sDoc) => {
      const student = sDoc.data() as Student;
      if (student.status !== 'Active') return;
      if (classId && classId !== 'all' && student.classId !== classId) return;

      const exists = allFees.find((f) => f.studentId === student.id && f.month === month && f.year === year);
      if (!exists) {
        const arrears = allFees
          .filter(f => f.studentId === student.id && f.status !== 'Paid' && f.month !== 'Annual Charges')
          .reduce((sum, f) => sum + ((f.amount || 0) - (f.paidTuition || 0)), 0);

        const netAmount = (student.monthlyFee || 0) - (student.discount || 0);

        const newFee = {
          id: nextId,
          studentId: student.id,
          month,
          year,
          baseAmount: student.monthlyFee || 0,
          discount: student.discount || 0,
          amount: netAmount > 0 ? netAmount : 0,
          previousArrears: arrears,
          status: 'Unpaid',
          issueDate: new Date().toISOString(),
          paymentDate: null
        };
        batch.set(doc(db, 'fees', nextId.toString()), newFee);
        nextId++;
        generatedCount++;
      }
    });

    await batch.commit();
    return NextResponse.json({ success: true, count: generatedCount });
  } catch (err) {
    console.error("Firebase POST Fees Error:", err);
    return NextResponse.json({ error: 'Failed to process request on cloud' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, paidTuition, paidAC } = await request.json();
    if (!id) return NextResponse.json({ error: 'Voucher ID missing' }, { status: 400 });

    const feeRef = doc(db, 'fees', id.toString());
    const feeSnap = await getDoc(feeRef);
    if (!feeSnap.exists()) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    const feeRecord = feeSnap.data() as FeeRecord;
    const studentId = feeRecord.studentId;
    const paymentDate = new Date().toISOString();
    const batch = writeBatch(db);

    // 1. Handle AC Payment
    const newPaidAC = parseFloat(paidAC || '0');
    if (newPaidAC > 0) {
      const studentRef = doc(db, 'students', studentId.toString());
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        batch.update(studentRef, {
          paidAnnualCharges: (studentSnap.data().paidAnnualCharges || 0) + newPaidAC
        });
      }
      batch.update(feeRef, {
        paidAC: (feeRecord.paidAC || 0) + newPaidAC,
        totalReceived: (feeRecord.totalReceived || 0) + newPaidAC
      });
    }

    // 2. Handle Tuition Payment (Propagation)
    let remainingPayment = parseFloat(paidTuition || '0');
    if (remainingPayment > 0) {
      const allFeesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', studentId)));
      let studentVouchers: any[] = [];
      allFeesSnap.forEach(doc => studentVouchers.push({ ...doc.data(), docId: doc.id }));
      
      studentVouchers = studentVouchers
        .filter(f => f.month !== 'Annual Charges' && f.status !== 'Paid')
        .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

      for (const v of studentVouchers) {
        if (remainingPayment <= 0) break;
        const voucherBalance = (v.amount || 0) - (v.paidTuition || 0);
        if (voucherBalance <= 0) continue;

        const amountToApply = Math.min(remainingPayment, voucherBalance);
        const newPaidTuition = (v.paidTuition || 0) + amountToApply;
        
        batch.update(doc(db, 'fees', v.docId), {
          paidTuition: newPaidTuition,
          totalReceived: (v.totalReceived || 0) + amountToApply,
          paymentDate: paymentDate,
          status: newPaidTuition >= (v.amount || 0) ? 'Paid' : 'Partially Paid'
        });
        
        remainingPayment -= amountToApply;
      }

      // Overpayment applies to the current voucher
      if (remainingPayment > 0) {
        const currentFeeSnap = await getDoc(feeRef);
        const currentData = currentFeeSnap.data();
        batch.update(feeRef, {
          paidTuition: (currentData?.paidTuition || 0) + remainingPayment,
          totalReceived: (currentData?.totalReceived || 0) + remainingPayment,
          status: 'Paid'
        });
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Firebase PUT Fees Error:", err);
    return NextResponse.json({ error: 'System Error processing payment on cloud' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const feeRef = doc(db, 'fees', id.toString());
    const feeSnap = await getDoc(feeRef);
    if (!feeSnap.exists()) return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });

    const feeToRemove = feeSnap.data() as FeeRecord;
    const batch = writeBatch(db);

    // REVERSAL LOGIC: Undo student's paid AC balance
    if (feeToRemove.status === 'Paid' && (feeToRemove.paidAC || 0) > 0) {
      const studentRef = doc(db, 'students', feeToRemove.studentId.toString());
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        batch.update(studentRef, {
          paidAnnualCharges: Math.max(0, (studentSnap.data().paidAnnualCharges || 0) - (feeToRemove.paidAC || 0))
        });
      }
    }

    batch.delete(feeRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Firebase DELETE Fee Error:", err);
    return NextResponse.json({ error: 'Failed to reverse fee on cloud' }, { status: 500 });
  }
}
