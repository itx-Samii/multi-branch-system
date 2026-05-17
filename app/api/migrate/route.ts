import { NextResponse } from 'next/server';
import { readData as readLocalData, readConfig as readLocalConfig } from '@/lib/fileHandler';
import { writeData as writeCloudData, writeConfig as writeCloudConfig } from '@/lib/dbHandler';

export async function GET() {
  try {
    const files = ['students.json', 'fees.json', 'classes.json', 'expenses.json', 'salaries.json', 'staff.json'];
    let results: Record<string, number> = {};

    for (const file of files) {
      const localData = await readLocalData<any>(file);
      await writeCloudData(file, localData);
      results[file] = localData.length;
    }

    const localConfig = await readLocalConfig();
    await writeCloudConfig(localConfig);
    results['config'] = 1;

    return NextResponse.json({ success: true, message: 'Migration to MongoDB Atlas completed successfully', counts: results });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: err?.message || 'Migration failed' }, { status: 500 });
  }
}
