import { NextResponse } from 'next/server';
import { writeData, clearCache } from '@/lib/fileHandler';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function POST(request: Request) {
  try {
    const backup = await request.json();

    if (!backup.system || backup.system !== 'School Pay ERP' || !backup.data) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // 1. Clear current cache
    clearCache();

    // 2. Restore individual files
    const fileKeys = Object.keys(backup.data);
    for (const key of fileKeys) {
      const fileName = `${key}.json`;
      const content = backup.data[key];
      await writeData(fileName, content);
    }

    // 3. Restore config if present
    if (backup.config) {
      const configPath = path.join(DATA_DIR, 'config.json');
      await fs.writeFile(configPath, JSON.stringify(backup.config, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true, message: 'System restored successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Restoration failed' }, { status: 500 });
  }
}
