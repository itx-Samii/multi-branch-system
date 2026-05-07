import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query,
  where
} from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const classesSnap = await getDocs(collection(db, 'classes'));
    let classes: any[] = [];
    classesSnap.forEach(doc => classes.push({ ...doc.data(), id: parseInt(doc.id) }));

    const studentsSnap = await getDocs(collection(db, 'students'));
    let allStudents: any[] = [];
    studentsSnap.forEach(doc => allStudents.push(doc.data()));

    const enrichedClasses = classes.map((c: any) => {
      const count = allStudents.filter((s: any) => s.classId?.toString() === c.id.toString()).length;
      return { ...c, studentCount: count };
    });

    return NextResponse.json(enrichedClasses);
  } catch (err) {
    console.error("Firebase GET Classes Error:", err);
    return NextResponse.json({ error: 'Failed to fetch classes from cloud' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Class name is required' }, { status: 400 });

    const classesSnap = await getDocs(collection(db, 'classes'));
    let classes: any[] = [];
    let maxId = 0;
    classesSnap.forEach(doc => {
      const id = parseInt(doc.id);
      if (id > maxId) maxId = id;
      classes.push(doc.data());
    });

    // Check if class with same name and section exists
    const exists = classes.find((c: any) => c.name.toLowerCase() === body.name.toLowerCase() && (c.section || '').toLowerCase() === (body.section || '').toLowerCase());
    if (exists) {
      return NextResponse.json({ error: 'Class with this Name and Section already exists' }, { status: 400 });
    }

    const newId = maxId + 1;
    const newClass = { 
      id: newId, 
      name: body.name,
      section: body.section || '',
      createdAt: new Date().toISOString() 
    };
    
    await setDoc(doc(db, 'classes', newId.toString()), newClass);
    return NextResponse.json(newClass);
  } catch (err) {
    console.error("Firebase POST Class Error:", err);
    return NextResponse.json({ error: 'Failed to create class on cloud' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, section } = body;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Class name is required' }, { status: 400 });

    const docRef = doc(db, 'classes', id.toString());
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const updatedClass = { 
      name, 
      section: section || '',
      updatedAt: new Date().toISOString() 
    };
    
    await updateDoc(docRef, updatedClass);
    return NextResponse.json({ id, ...updatedClass });
  } catch (err) {
    console.error("Firebase PUT Class Error:", err);
    return NextResponse.json({ error: 'Failed to update class on cloud' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const docRef = doc(db, 'classes', id);
    await deleteDoc(docRef);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Firebase DELETE Class Error:", err);
    return NextResponse.json({ error: 'Failed to delete class from cloud' }, { status: 500 });
  }
}
