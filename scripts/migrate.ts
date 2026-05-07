import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DATA_DIR = path.join(process.cwd(), 'data');

async function migrate(fileName, collectionName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${fileName} not found, skipping...`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Migrating ${data.length} records to ${collectionName}...`);

  // Firestore Batch has a limit of 500 operations
  for (let i = 0; i < data.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = data.slice(i, i + 500);
    const colRef = collection(db, collectionName);

    chunk.forEach(item => {
      const docRef = doc(colRef, item.id.toString());
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log(`Uploaded chunk ${i / 500 + 1}`);
  }
}

async function start() {
  try {
    await migrate('students.json', 'students');
    await migrate('fees.json', 'fees');
    await migrate('classes.json', 'classes');
    console.log("SUCCESS: All data migrated to Firebase!");
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

start();
