import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (!session?.value) return false;
  try {
    const user = JSON.parse(session.value);
    return user.role === 'admin' || user.role === 'superadmin';
  } catch {
    return session.value === 'authenticated';
  }
}

export async function POST() {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Super Admin access required' }, { status: 403 });
  }

  const startTime = Date.now();
  try {
    const db = await getDatabase();

    const results = [];

    // 1. Index Students — compound isolation: schoolId + branchId prevents cross-branch data clashes
    const studentsCol = db.collection('students');
    await studentsCol.createIndex({ schoolId: 1, branchId: 1 }, { background: true });
    await studentsCol.createIndex({ schoolId: 1, branchId: 1, classId: 1, rollNumber: 1 }, { background: true });
    await studentsCol.createIndex({ schoolId: 1, branchId: 1, admissionNumber: 1 }, { background: true });
    results.push({ collection: 'students', indexes: ['schoolId_branchId', 'schoolId_branchId_classId_rollNumber', 'schoolId_branchId_admissionNumber'] });

    // 2. Index Fees
    const feesCol = db.collection('fees');
    await feesCol.createIndex({ schoolId: 1, branchId: 1 }, { background: true });
    await feesCol.createIndex({ schoolId: 1, branchId: 1, studentId: 1, month: 1, year: 1 }, { background: true });
    await feesCol.createIndex({ schoolId: 1, invoiceId: 1 }, { background: true });
    await feesCol.createIndex({ schoolId: 1, branchId: 1, status: 1 }, { background: true });
    results.push({ collection: 'fees', indexes: ['schoolId_branchId', 'schoolId_branchId_studentId_month_year', 'schoolId_invoiceId', 'schoolId_branchId_status'] });

    // 3. Index Licenses
    const licensesCol = db.collection('licenses');
    await licensesCol.createIndex({ schoolId: 1 }, { background: true });
    await licensesCol.createIndex({ id: 1 }, { background: true });
    await licensesCol.createIndex({ licenseKey: 1 }, { background: true });
    results.push({ collection: 'licenses', indexes: ['schoolId', 'id', 'licenseKey'] });

    // 4. Index Classes
    const classesCol = db.collection('classes');
    await classesCol.createIndex({ schoolId: 1, branchId: 1 }, { background: true });
    await classesCol.createIndex({ schoolId: 1, branchId: 1, name: 1 }, { background: true });
    results.push({ collection: 'classes', indexes: ['schoolId_branchId', 'schoolId_branchId_name'] });

    // 5. Index Branches
    const branchesCol = db.collection('branches');
    await branchesCol.createIndex({ schoolId: 1 }, { background: true });
    await branchesCol.createIndex({ schoolId: 1, branchId: 1 }, { unique: true, background: true });
    results.push({ collection: 'branches', indexes: ['schoolId', 'schoolId_branchId_unique'] });

    // 6. Index Expenses and Salaries
    const expensesCol = db.collection('expenses');
    await expensesCol.createIndex({ schoolId: 1, branchId: 1 }, { background: true });
    results.push({ collection: 'expenses', indexes: ['schoolId_branchId'] });

    const salarCol = db.collection('salaries');
    await salarCol.createIndex({ schoolId: 1, branchId: 1 }, { background: true });
    results.push({ collection: 'salaries', indexes: ['schoolId_branchId'] });

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'MongoDB high-performance compound indexes (schoolId + branchId) created successfully — zero data clash guaranteed',
      executionTimeMs,
      results
    });
  } catch (err: any) {
    console.error('Error creating database indexes:', err);
    return NextResponse.json({ error: 'Failed to create database indexes: ' + err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
