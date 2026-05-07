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
  where 
} from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const classId = searchParams.get('classId') || 'all';

    console.log("Fetching students from Firestore...");
    const studentsSnap = await getDocs(collection(db, 'students'));
    console.log(`Found ${studentsSnap.size} students in Firestore`);

    let allStudents: any[] = [];
    studentsSnap.forEach(doc => allStudents.push({ ...doc.data() }));

    const classesSnap = await getDocs(collection(db, 'classes'));
    let allClasses: any[] = [];
    classesSnap.forEach(doc => allClasses.push({ ...doc.data() }));

    let filtered = allStudents.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(search) || 
                       s.fatherName?.toLowerCase().includes(search) ||
                       s.admissionNumber?.toLowerCase().includes(search);
      const classMatch = classId === 'all' || s.classId?.toString() === classId.toString();
      return nameMatch && classMatch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginated = filtered.slice(start, end).map((s) => {
      const dbClass = allClasses.find((c) => c.id.toString() === s.classId?.toString());
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
    console.error("Firebase GET Students Error:", err);
    return NextResponse.json({ error: 'Failed to fetch students', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Creating new student in Firestore:", body.name);
    
    const studentsSnap = await getDocs(collection(db, 'students'));
    let maxId = 0;
    studentsSnap.forEach(doc => {
      const id = parseInt(doc.id);
      if (id > maxId) maxId = id;
    });
    
    const newId = maxId + 1;
    const newStudent = { 
      ...body, 
      id: newId,
      createdAt: new Date().toISOString(),
      paidAnnualCharges: 0 
    };

    await setDoc(doc(db, 'students', newId.toString()), newStudent);
    return NextResponse.json(newStudent);
  } catch (err: any) {
    console.error("Firebase POST Student Error:", err);
    return NextResponse.json({ error: 'Failed to create student', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    console.log(`Updating student ID ${id} in Firestore`);
    const studentRef = doc(db, 'students', id.toString());
    const studentSnap = await getDoc(doc(db, 'students', id.toString()));
    
    if (!studentSnap.exists()) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const updatedData = { 
      ...updateData, 
      updatedAt: new Date().toISOString() 
    };
    
    await updateDoc(studentRef, updatedData);

    // Sync with fees if fee profile changed
    const feeFields = ['monthlyFee', 'discount', 'annualCharges'];
    const changed = feeFields.some(f => updateData[f] !== undefined);
    
    if (changed) {
      console.log(`Fee profile changed for student ${id}, syncing unpaid vouchers...`);
      const feesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', parseInt(id))));
      feesSnap.forEach(async (fDoc) => {
        if (fDoc.data().status !== 'Paid') {
          const newBase = updateData.monthlyFee ?? fDoc.data().baseAmount;
          const newDisc = updateData.discount ?? fDoc.data().discount;
          await updateDoc(doc(db, 'fees', fDoc.id), {
            baseAmount: newBase,
            discount: newDisc,
            amount: Math.max(0, newBase - newDisc)
          });
        }
      });
    }

    return NextResponse.json({ id, ...updatedData });
  } catch (err: any) {
    console.error("Firebase PUT Student Error:", err);
    return NextResponse.json({ error: 'Failed to update student', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    console.log(`Deleting student ID ${id} and their fees...`);
    const studentRef = doc(db, 'students', id);
    await deleteDoc(studentRef);

    // Cascade delete fees
    const feesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', parseInt(id))));
    feesSnap.forEach(async (fDoc) => {
      await deleteDoc(doc(db, 'fees', fDoc.id));
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Firebase DELETE Student Error:", err);
    return NextResponse.json({ error: 'Failed to delete student', details: err.message }, { status: 500 });
  }
}

// Helper to get doc
async function getDoc(docRef: any) {
  const snap = await getDocs(query(collection(db, 'students'), where('id', '==', parseInt(docRef.id))));
  return { exists: () => !snap.empty, data: () => snap.docs[0]?.data() };
}
