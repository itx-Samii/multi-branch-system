import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Simple global cache to avoid repeated Disk I/O
let cache: Record<string, any> = {};

async function ensureFileExists(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.access(filePath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf8');
    } else {
      throw err;
    }
  }
}

export async function readData<T>(fileName: string): Promise<T[]> {
  // Return cached data if available
  if (cache[fileName]) {
    return cache[fileName];
  }

  const filePath = path.join(DATA_DIR, fileName);
  await ensureFileExists(filePath);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data || '[]');
    const result = Array.isArray(parsed) ? parsed : [parsed];
    
    // Store in cache
    cache[fileName] = result;
    return result;
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err);
    return [];
  }
}

export async function readConfig(): Promise<any> {
  // Always read from disk for security settings to avoid cache issues
  const filePath = path.join(DATA_DIR, 'config.json');
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (err) {
    console.error(`CRITICAL: Could not read config.json at ${filePath}`, err);
    // If file doesn't exist, try to create it with default
    const defaultConfig = { adminPassword: 'admin123' };
    try {
      await fs.writeFile(filePath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return defaultConfig;
    } catch (writeErr) {
      console.error(`CRITICAL: Could not create default config.json`, writeErr);
      return defaultConfig; 
    }
  }
}

export async function writeConfig(config: any): Promise<void> {
  const filePath = path.join(DATA_DIR, 'config.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf8');
    cache['config.json'] = config;
  } catch (err) {
    console.error(`Error writing config:`, err);
    throw new Error(`Failed to save configuration.`);
  }
}

export async function writeData<T>(fileName: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, fileName);
  await ensureFileExists(filePath);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    // Update cache
    cache[fileName] = data;
  } catch (err) {
    console.error(`Error writing to ${fileName}:`, err);
    throw new Error(`Failed to save data. Please check file permissions.`);
  }
}

export async function generateId(fileName: string): Promise<number> {
  const data = await readData<{ id: number }>(fileName);
  if (data.length === 0) return 1;
  const maxId = Math.max(...data.map(item => item.id || 0));
  return maxId + 1;
}

export function clearCache() {
  cache = {};
}
