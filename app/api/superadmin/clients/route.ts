import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { hashPassword } from '@/lib/dbHandler';
import { ObjectId } from 'mongodb';

async function checkSuperAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (!session?.value) return false;
  try {
    const user = JSON.parse(session.value);
    return user.role === 'superadmin';
  } catch (e) {
    return false;
  }
}

export async function GET() {
  if (!await checkSuperAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const db = await getDatabase();
    const licensesCol = db.collection('licenses');
    let clients: any[] = await licensesCol.find({}).toArray();

    for (const c of clients) {
      if (!c.schoolId || c.id === 'client_1') {
        await licensesCol.updateOne(
          { _id: c._id },
          { $set: { schoolId: 'school_brookfield', id: 'school_brookfield' } }
        );
        c.schoolId = 'school_brookfield';
        c.id = 'school_brookfield';
      }
    }

    if (clients.length === 0) {
      const defaultClient = {
        id: 'school_brookfield',
        schoolId: 'school_brookfield',
        clientName: 'Brook Field School System',
        licenseKey: process.env.LICENSE_KEY || 'SCHOOL-PAY-DEMO-KEY-2026',
        status: 'active',
        maxStudents: 1000,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };
      await licensesCol.insertOne(defaultClient);
      clients = [defaultClient];
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

    const cleanClients = await Promise.all(clients.map(async (c: any) => {
      const sid = c.schoolId || 'school_brookfield';
      // Fetch live student count for each school
      let currentStudents = 0;
      try {
        const query = (sid === 'school_brookfield' || !sid)
          ? { $or: [{ schoolId: 'school_brookfield' }, { schoolId: { $exists: false } }, { schoolId: null }, { schoolId: '' }] }
          : { schoolId: sid };
        currentStudents = await db.collection('students').countDocuments(query);
      } catch {}
      return {
        id: c.schoolId || c.id || (c._id ? c._id.toString() : 'school_brookfield'),
        schoolId: sid,
        clientName: c.clientName || 'School System',
        licenseKey: c.licenseKey || 'KEY-DEMO',
        status: c.status || 'active',
        maxStudents: c.maxStudents || 1000,
        currentStudents,
        features: { ...defaultFeatures, ...(c.features || {}) },
        createdAt: c.createdAt || new Date().toISOString(),
        lastSync: c.lastSync || new Date().toISOString()
      };
    }));

    return NextResponse.json(cleanClients);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch SaaS clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await checkSuperAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const { clientName, licenseKey, maxStudents, adminUsername, adminPassword } = await request.json();
    if (!clientName || !licenseKey || !adminUsername) {
      return NextResponse.json({ error: 'Client name, license key, and admin username are required' }, { status: 400 });
    }

    const db = await getDatabase();
    const licensesCol = db.collection('licenses');

    const existing = await licensesCol.findOne({ licenseKey: licenseKey.trim() });
    if (existing) {
      return NextResponse.json({ error: 'License key already exists' }, { status: 400 });
    }

    const existingUser = await db.collection('config').findOne({ 'value.adminUsername': adminUsername.trim().toLowerCase() });
    if (existingUser || adminUsername.trim().toLowerCase() === 'superadmin') {
      return NextResponse.json({ error: 'Principal Login Username is already taken by another school' }, { status: 400 });
    }

    const cleanSlug = clientName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const schoolId = `school_${cleanSlug}_${Math.random().toString(36).substring(2, 6)}`;

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

    const newClient = {
      id: schoolId,
      schoolId,
      clientName: clientName.trim(),
      adminUsername: adminUsername.trim().toLowerCase(),
      licenseKey: licenseKey.trim(),
      status: 'active',
      maxStudents: maxStudents ? parseInt(maxStudents, 10) : 1000,
      features: defaultFeatures,
      createdAt: new Date().toISOString(),
      lastSync: new Date().toISOString()
    };

    await licensesCol.insertOne(newClient);

    const initialConfig = {
      adminUsername: adminUsername.trim().toLowerCase(),
      adminPassword: hashPassword(adminPassword || 'principal123'),
      schoolName: clientName.trim()
    };
    await db.collection('config').updateOne(
      { key: `app_settings_${schoolId}` },
      { $set: { key: `app_settings_${schoolId}`, value: initialConfig, schoolId } },
      { upsert: true }
    );

    const defaultAccountant = {
      id: 1,
      username: `${adminUsername.trim().toLowerCase()}_acc`,
      password: hashPassword('accountant123'),
      displayName: `${clientName.trim()} Accountant`,
      role: 'accountant',
      status: 'active',
      schoolId,
      createdAt: new Date().toISOString()
    };
    await db.collection('users').insertOne(defaultAccountant);

    return NextResponse.json({ success: true, client: newClient });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create SaaS client' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!await checkSuperAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const { id, status, clientName, maxStudents, licenseKey, adminPassword, features } = await request.json();
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const db = await getDatabase();
    const licensesCol = db.collection('licenses');

    let query: any = { id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id }, { _id: new ObjectId(id) }, { schoolId: id }] };
    } else {
      query = { $or: [{ id }, { schoolId: id }] };
    }

    const client = await licensesCol.findOne(query);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updateFields: any = { lastSync: new Date().toISOString() };
    if (status !== undefined) updateFields.status = status;
    if (clientName !== undefined && clientName.trim() !== '') updateFields.clientName = clientName.trim();
    if (maxStudents !== undefined) updateFields.maxStudents = parseInt(maxStudents, 10) || 1000;
    if (licenseKey !== undefined && licenseKey.trim() !== '') updateFields.licenseKey = licenseKey.trim();
    if (features !== undefined) updateFields.features = features;

    await licensesCol.updateOne({ _id: client._id }, { $set: updateFields });

    const targetSchoolId = client.schoolId || client.id || 'school_brookfield';

    if (targetSchoolId === 'school_brookfield' || targetSchoolId === 'client_1' || client.id === 'client_1') {
      await db.collection('config').updateOne(
        { key: 'software_license' },
        { $set: { key: 'software_license', value: { status: updateFields.status || client.status, clientName: updateFields.clientName || client.clientName, key: updateFields.licenseKey || client.licenseKey, lastChecked: new Date().toISOString() } } },
        { upsert: true }
      );
    }

    if (adminPassword && adminPassword.trim() !== '') {
      const newHash = hashPassword(adminPassword.trim());
      await db.collection('config').updateOne(
        { key: `app_settings_${targetSchoolId}` },
        { $set: { 'value.adminPassword': newHash, schoolId: targetSchoolId } }
      );
    }

    return NextResponse.json({ success: true, client: { ...client, ...updateFields } });
  } catch (err: any) {
    console.error('Superadmin client update error:', err);
    return NextResponse.json({ error: 'Failed to update client profile' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await checkSuperAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const db = await getDatabase();
    const licensesCol = db.collection('licenses');

    let query: any = { id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id }, { _id: new ObjectId(id) }, { schoolId: id }] };
    } else {
      query = { $or: [{ id }, { schoolId: id }] };
    }

    const client = await licensesCol.findOne(query);
    if (client) {
      await licensesCol.deleteOne({ _id: client._id });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete SaaS client' }, { status: 500 });
  }
}
