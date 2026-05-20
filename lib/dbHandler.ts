import { getDatabase } from './mongodb';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function getTenantId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('school-session');
    if (!session?.value) return 'school_brookfield';
    const user = JSON.parse(session.value);
    return user.schoolId || 'school_brookfield';
  } catch {
    return 'school_brookfield';
  }
}

export async function getTenantBranchId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('school-session');
    if (!session?.value) return null;
    const user = JSON.parse(session.value);
    // Return branchId if it exists in session, otherwise null (means admin/all branches)
    return user.branchId || null;
  } catch {
    return null;
  }
}

// --- Cache with TTL (30 seconds) ---
const CACHE_TTL_MS = 30_000;
interface CacheEntry {
  data: any;
  timestamp: number;
}
let cache: Record<string, CacheEntry> = {};

function getCached(key: string): any | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

export function clearCache() {
  cache = {};
}

// --- Password Hashing (Node.js crypto scrypt) ---
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || typeof stored !== 'string') return false;
  if (!stored.includes(':')) {
    return password === stored;
  }
  try {
    const [salt, storedHash] = stored.split(':');
    const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (err) {
    return false;
  }
}

// --- Map JSON file names to MongoDB collection names ---
function getCollectionName(fileName: string): string {
  return fileName.replace('.json', '');
}

// --- CRUD Utilities ---

export async function readData<T>(fileName: string, schoolId: string = 'school_brookfield'): Promise<T[]> {
  const collectionName = getCollectionName(fileName);
  const cacheKey = `${collectionName}_${schoolId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const db = await getDatabase();
    const query = (schoolId === 'school_brookfield' || !schoolId) ? { $or: [{ schoolId: 'school_brookfield' }, { schoolId: { $exists: false } }, { schoolId: null }, { schoolId: '' }] } : { schoolId };
    const data = await db.collection(collectionName).find(query).toArray();
    
    const cleanData = data.map(item => {
      const { _id, ...rest } = item;
      return { _id: _id.toString(), id: item.id ?? _id.toString(), ...rest, schoolId: schoolId || 'school_brookfield' } as unknown as T;
    });

    setCache(cacheKey, cleanData);
    return cleanData;
  } catch (err) {
    console.error(`Error reading MongoDB collection ${collectionName} for ${schoolId}:`, err);
    return [];
  }
}

export async function writeData<T>(fileName: string, data: T[], schoolId: string = 'school_brookfield'): Promise<void> {
  const collectionName = getCollectionName(fileName);
  const cacheKey = `${collectionName}_${schoolId}`;
  try {
    const db = await getDatabase();
    const col = db.collection(collectionName);

    const delQuery = (schoolId === 'school_brookfield' || !schoolId) ? { $or: [{ schoolId: 'school_brookfield' }, { schoolId: { $exists: false } }, { schoolId: null }, { schoolId: '' }] } : { schoolId };
    await col.deleteMany(delQuery);
    if (data && data.length > 0) {
      const docsToInsert = data.map((item: any) => {
        const { _id, ...rest } = item;
        return { id: item.id ?? _id?.toString(), ...rest, schoolId: schoolId || 'school_brookfield' };
      });
      await col.insertMany(docsToInsert);
    }
    setCache(cacheKey, data);
  } catch (err) {
    console.error(`Error writing to MongoDB collection ${collectionName} for ${schoolId}:`, err);
    throw new Error(`Failed to save data to cloud database.`);
  }
}

export async function generateId(fileName: string, schoolId: string = 'school_brookfield'): Promise<number> {
  const data = await readData<{ id: number }>(fileName, schoolId);
  if (data.length === 0) return 1;
  const maxId = Math.max(...data.map(item => item.id || 0));
  return maxId + 1;
}

// --- Config Utilities ---
export async function readConfig(schoolId: string = 'school_brookfield'): Promise<any> {
  try {
    const db = await getDatabase();
    const configDoc = await db.collection('config').findOne({ key: `app_settings_${schoolId}` });
    if (configDoc && configDoc.value) {
      return configDoc.value;
    }
    const defaultConfig = { adminPassword: hashPassword('brookfield') };
    await db.collection('config').updateOne(
      { key: `app_settings_${schoolId}` },
      { $set: { key: `app_settings_${schoolId}`, value: defaultConfig, schoolId } },
      { upsert: true }
    );
    return defaultConfig;
  } catch (err) {
    console.error(`Error reading config from MongoDB for ${schoolId}:`, err);
    return { adminPassword: hashPassword('brookfield') };
  }
}

export async function writeConfig(config: any, schoolId: string = 'school_brookfield'): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection('config').updateOne(
      { key: `app_settings_${schoolId}` },
      { $set: { key: `app_settings_${schoolId}`, value: config, schoolId } },
      { upsert: true }
    );
  } catch (err) {
    console.error(`Error writing config to MongoDB for ${schoolId}:`, err);
    throw new Error(`Failed to save configuration to cloud.`);
  }
}
