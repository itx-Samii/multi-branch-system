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
  writeBatch
} from 'firebase/firestore';

// --- TypeScript Interfaces ---
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
  rollNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const classIdFilter = searchParams.get('classId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 1. Fetch Students
    const studentsSnap = await getDocs(collection(db, 'students'));
    let allStudents: any[] = [];
    studentsSnap.forEach(doc => allStudents.push({ ...doc.data() }));

    // 2. Fetch Classes (for className mapping)
    const classesSnap = await getDocs(collection(db, 'classes'));
    let allClasses: any[] = [];
    classesSnap.forEach(doc => allClasses.push({ ...doc.data() }));
    
    let filtered = allStudents;
    
    // Server side filtering by class
    if (classIdFilter && classIdFilter !== 'all') {
      filtered = filtered.filter((s) => s.classId?.toString() === classIdFilter);
    }

    // Server side search filtering
    filtered = search ? 
      filtered.filter((s) => 
        s.name.toLowerCase().includes(search) || 
        s.fatherName?.toLowerCase().includes(search) ||
        s.rollNumber?.toLowerCase().includes(search)
      ) : filtered;

    // Server side pagination
    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end).map((s) => {
      const dbClass = allClasses.find((c) => c.id.toString() === s.classId?.toString());
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
    console.error("Firebase GET Error:", err);
    return NextResponse.json({ error: 'Failed to fetch students from cloud' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    }
    if (!body.fatherName || typeof body.fatherName !== 'string' || body.fatherName.trim().length === 0) {
      return NextResponse.json({ error: "Father's name is required" }, { status: 400 });
    }
    if (!body.classId) {
      return NextResponse.json({ error: 'Class assignment is required' }, { status: 400 });
    }

    // Generate unique numeric ID (Check existing max ID)
    const studentsSnap = await getDocs(collection(db, 'students'));
    let maxId = 0;
    studentsSnap.forEach(doc => {
      const id = parseInt(doc.id);
      if (id > maxId) maxId = id;
    });
    const newId = maxId + 1;
    
    const newStudent: Student = {
      id: newId,
      name: body.name.trim(),
      fatherName: body.fatherName.trim(),
      admissionNumber: body.admissionNumber?.trim() || undefined,
      classId: body.classId.toString(),
      monthlyFee: parseFloat(body.monthlyFee) || 0,
      discount: parseFloat(body.discount) || 0,
      annualCharges: parseFloat(body.annualCharges) || 0,
      paidAnnualCharges: 0,
      status: body.status || 'Active',
      rollNumber: body.rollNumber || undefined,
      createdAt: new Date().toISOString()
    };

    // Save to Firestore using the ID as document name
    await setDoc(doc(db, 'students', newId.toString()), newStudent);
    
    return NextResponse.json(newStudent);
  } catch (err) {
    console.error("Firebase POST Error:", err);
    return NextResponse.json({ error: 'Failed to add student to cloud' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const studentId = body.id.toString();
    const docRef = doc(db, 'students', studentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const existingStudent = docSnap.data() as Student;
    
    const updatedData: Partial<Student> = {
      name: body.name !== undefined ? body.name.trim() : existingStudent.name,
      fatherName: body.fatherName !== undefined ? body.fatherName.trim() : existingStudent.fatherName,
      admissionNumber: body.admissionNumber !== undefined ? (body.admissionNumber?.trim() || undefined) : existingStudent.admissionNumber,
      classId: body.classId !== undefined ? body.classId.toString() : existingStudent.classId,
      monthlyFee: body.monthlyFee !== undefined ? parseFloat(body.monthlyFee) : existingStudent.monthlyFee,
      discount: body.discount !== undefined ? parseFloat(body.discount) : existingStudent.discount,
      annualCharges: body.annualCharges !== undefined ? parseFloat(body.annualCharges) : existingStudent.annualCharges,
      status: (body.status === 'Active' || body.status === 'Inactive') ? body.status : existingStudent.status,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updatedData);

    // AUTO-SYNC: If fee or discount changed, update active unpaid vouchers in 'fees' collection
    if (body.monthlyFee !== undefined || body.discount !== undefined || body.annualCharges !== undefined) {
      const feesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', parseInt(studentId))));
      const batch = writeBatch(db);
      
      feesSnap.forEach((feeDoc) => {
        const f = feeDoc.data();
        if (f.status === 'Unpaid') {
          const base = body.monthlyFee ?? f.baseAmount;
          const disc = body.discount ?? f.discount;
          batch.update(doc(db, 'fees', feeDoc.id), {
            baseAmount: base,
            discount: disc,
            amount: base - disc,
            remainingAnnualCharges: body.annualCharges !== undefined ? (body.annualCharges - (f.paidAC || 0)) : (f.remainingAnnualCharges || 0)
          });
        }
      });
      await batch.commit();
    }
    
    return NextResponse.json({ ...existingStudent, ...updatedData });
  } catch (err) {
    console.error("Firebase PUT Error:", err);
    return NextResponse.json({ error: 'Failed to update student on cloud' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const docRef = doc(db, 'students', id);
    await deleteDoc(docRef);

    // CASCADING DELETE: Remove all fees associated with this student
    const feesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', parseInt(id))));
    const batch = writeBatch(db);
    feesSnap.forEach((feeDoc) => {
      batch.delete(doc(db, 'fees', feeDoc.id));
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Firebase DELETE Error:", err);
    return NextResponse.json({ error: 'Failed to delete student from cloud' }, { status: 500 });
  }
}
