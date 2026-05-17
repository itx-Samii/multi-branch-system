import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (!session?.value) return false;
  try {
    const user = JSON.parse(session.value);
    return user.role === 'admin' || user.role === 'superadmin';
  } catch (e) {
    return session.value === 'authenticated';
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('school-session');
    let schoolId = 'school_brookfield';
    if (session?.value) {
      try {
        const user = JSON.parse(session.value);
        if (user?.schoolId) schoolId = user.schoolId;
      } catch (e) {
        // ignore
      }
    }

    if (schoolId === 'master') {
      return NextResponse.json({ status: 'active', clientName: 'Master Controller', key: 'MASTER-KEY', maxStudents: 100000, lastChecked: new Date().toISOString() });
    }

    const db = await getDatabase();
    const licensesCol = db.collection('licenses');

    let query: any = { schoolId };
    if (ObjectId.isValid(schoolId)) {
      query = { $or: [{ schoolId }, { _id: new ObjectId(schoolId) }, { id: schoolId }] };
    } else {
      query = { $or: [{ schoolId }, { id: schoolId }] };
    }

    let licenseDoc = await licensesCol.findOne(query);

    if (!licenseDoc && (schoolId === 'school_brookfield' || schoolId === 'client_1')) {
      licenseDoc = await licensesCol.findOne({
        $or: [{ id: 'client_1' }, { id: 'school_brookfield' }, { schoolId: 'school_brookfield' }, { clientName: /Brook Field/i }]
      });
    }

    const configLic = await db.collection('config').findOne({ key: 'software_license' });
    let finalStatus = licenseDoc ? licenseDoc.status : 'active';
    if (configLic && configLic.value && configLic.value.status === 'blocked') {
      finalStatus = 'blocked';
    }

    const defaultFeatures = {
      collection: true,
      generate: true,
      tracking: true,
      reports: true,
      expenses: true,
      ledger: true,
      salaries: true,
      classes: true,
      students: true,
      users: true
    };
    const features = licenseDoc?.features || (configLic?.value?.features || defaultFeatures);

    if (licenseDoc) {
      return NextResponse.json({
        status: finalStatus,
        clientName: licenseDoc.clientName || 'School System',
        key: licenseDoc.licenseKey || 'KEY',
        maxStudents: licenseDoc.maxStudents || 1000,
        features: { ...defaultFeatures, ...features },
        lastChecked: new Date().toISOString()
      });
    }

    if (configLic && configLic.value) {
      return NextResponse.json({ ...configLic.value, status: finalStatus, features: { ...defaultFeatures, ...features } });
    }

    return NextResponse.json({ status: finalStatus, clientName: 'Brook Field School System', maxStudents: 1000, features: defaultFeatures });
  } catch (err) {
    return NextResponse.json({ status: 'active', clientName: 'Brook Field School System', maxStudents: 1000, features: { collection: true, generate: true, tracking: true, reports: true, expenses: true, ledger: true, salaries: true, classes: true, students: true, users: true } });
  }
}

export async function POST(request: Request) {
  if (!await checkAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { status, clientName, key } = await request.json();
    const db = await getDatabase();
    
    const newLic = {
      status: status === 'blocked' ? 'blocked' : 'active',
      clientName: clientName || 'Brook Field School System',
      key: key || process.env.LICENSE_KEY || 'SCHOOL-PAY-DEMO-KEY-2026',
      lastChecked: new Date().toISOString()
    };

    await db.collection('config').updateOne({ key: 'software_license' }, { $set: { key: 'software_license', value: newLic } }, { upsert: true });
    return NextResponse.json({ success: true, license: newLic });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update license' }, { status: 500 });
  }
}
