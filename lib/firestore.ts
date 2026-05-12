/**
 * lib/firestore.ts
 * Server-side Firestore helper using Firebase Admin SDK.
 * Credentials loaded from environment variables (works on Vercel + locally).
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ─── Singleton Admin App ───────────────────────────────────────────────────────

let _db: Firestore | null = null;

function getAdminDb(): Firestore {
  if (_db) return _db;

  if (!getApps().length) {
    // Support two modes:
    // 1. GOOGLE_APPLICATION_CREDENTIALS_JSON env var (Vercel / production)
    // 2. serviceAccountKey.json file (local dev fallback)
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (credJson) {
      // Production: parse JSON from env var
      const serviceAccount = JSON.parse(credJson);
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      // Local dev: load from file
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));
      initializeApp({ credential: cert(serviceAccount) });
    }
  }

  _db = getFirestore(getApps()[0]);
  return _db;
}

// ─── Collection CRUD ──────────────────────────────────────────────────────────

/** Read all documents from a Firestore collection as a plain array. */
export async function getCollection(collectionName: string): Promise<any[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ ...doc.data() }));
}

/** Set/overwrite a document by its id. */
export async function setDoc(
  collectionName: string,
  id: string | number,
  data: Record<string, any>
): Promise<void> {
  const db = getAdminDb();
  await db.collection(collectionName).doc(String(id)).set(data, { merge: true });
}

/** Add a new document. data must contain an `id` field. */
export async function addDoc(
  collectionName: string,
  data: Record<string, any>
): Promise<void> {
  const db = getAdminDb();
  await db.collection(collectionName).doc(String(data.id)).set(data);
}

/** Delete a document by its id. */
export async function deleteDoc(
  collectionName: string,
  id: string | number
): Promise<void> {
  const db = getAdminDb();
  await db.collection(collectionName).doc(String(id)).delete();
}

/** Delete all documents in a collection where field === value. */
export async function deleteWhere(
  collectionName: string,
  field: string,
  value: any
): Promise<void> {
  const db = getAdminDb();
  const snapshot = await db.collection(collectionName).where(field, '==', value).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/** Generate next numeric ID (max existing + 1). */
export async function generateId(collectionName: string): Promise<number> {
  const docs = await getCollection(collectionName);
  if (docs.length === 0) return 1;
  const maxId = Math.max(...docs.map((d) => Number(d.id) || 0));
  return maxId + 1;
}

// ─── Config (singleton document) ─────────────────────────────────────────────

const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'admin';

/** Read admin config from Firestore. Seeds default password on first run. */
export async function getConfig(): Promise<any> {
  const db = getAdminDb();
  const docRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
  const snap = await docRef.get();

  if (!snap.exists) {
    const { hashPassword } = await import('./fileHandler');
    const defaultConfig = { adminPassword: hashPassword('admin123') };
    await docRef.set(defaultConfig);
    return defaultConfig;
  }

  return snap.data();
}

/** Write admin config to Firestore. */
export async function setConfig(config: Record<string, any>): Promise<void> {
  const db = getAdminDb();
  await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).set(config, { merge: true });
}
