import { NextResponse } from 'next/server';
import { readData, readConfig } from '@/lib/fileHandler';

export async function GET() {
  try {
    const files = [
      'students.json',
      'fees.json',
      'expenses.json',
      'staff.json',
      'salaries_history.json',
      'classes.json'
    ];

    const backupData: any = {
      timestamp: new Date().toISOString(),
      system: 'School Pay ERP',
      data: {}
    };

    // Load each file
    for (const file of files) {
      const content = await readData<any>(file);
      backupData.data[file.replace('.json', '')] = content;
    }

    // Load config
    backupData.config = await readConfig();

    return NextResponse.json(backupData);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}
