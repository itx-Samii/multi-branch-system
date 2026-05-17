import { NextResponse } from 'next/server';
import { readData, readConfig, getTenantId } from '@/lib/dbHandler';

export async function GET() {
  try {
    const schoolId = await getTenantId();

    const files = [
      'students.json',
      'fees.json',
      'expenses.json',
      'staff.json',
      'salaries_history.json',
      'classes.json',
      'users.json'
    ];

    const backupData: any = {
      timestamp: new Date().toISOString(),
      system: 'School Pay ERP',
      schoolId,
      data: {}
    };

    // Load each file scoped to the correct tenant
    for (const file of files) {
      const content = await readData<any>(file, schoolId);
      backupData.data[file.replace('.json', '')] = content;
    }

    // Load tenant config
    backupData.config = await readConfig(schoolId);

    return NextResponse.json(backupData);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}
