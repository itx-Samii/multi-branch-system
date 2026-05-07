import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function migrateCollection(fileName: string, collectionName: string) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const batch = writeBatch(db);
  const colRef = collection(db, collectionName);

  console.log(`Migrating ${data.length} records to ${collectionName}...`);

  for (const item of data) {
    // Use the existing ID as the document ID
    const docRef = doc(colRef, item.id.toString());
    batch.set(docRef, item);
  }

  await batch.commit();
  return { success: true, count: data.length };
}

export async function GET() {
  try {
    const studentsRes = await migrateCollection('students.json', 'students');
    const feesRes = await migrateCollection('fees.json', 'fees');
    const classesRes = await migrateCollection('classes.json', 'classes');

    return NextResponse.json({
      message: "Migration completed successfully!",
      details: {
        students: studentsRes,
        fees: feesRes,
        classes: classesRes
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
