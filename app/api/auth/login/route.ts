import { NextResponse } from 'next/server';
import { readConfig, readData, verifyPassword } from '@/lib/dbHandler';
import { getDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const trimmedUsername = username?.trim()?.toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedUsername || !trimmedPassword) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const config = await readConfig();
    const masterConfig = await readConfig('master');

    // 1. Check Super Admin (Developer / System Owner)
    if (trimmedUsername === 'superadmin') {
      if (verifyPassword(trimmedPassword, masterConfig.superAdminPassword || config.superAdminPassword || config.adminPassword)) {
        const cookieStore = await cookies();
        const payload = JSON.stringify({ username: 'superadmin', role: 'superadmin', displayName: 'Master SaaS Controller', schoolId: 'master' });
        cookieStore.set('school-session', payload, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return NextResponse.json({ success: true, user: { username: 'superadmin', role: 'superadmin', displayName: 'Master SaaS Controller', schoolId: 'master' } });
      } else {
        return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
      }
    }

    const db = await getDatabase();

    // 2. Check Client/School Admin (Principal) against SaaS configs
    const clientSchool = await db.collection('config').findOne({
      $or: [
        { 'value.adminUsername': trimmedUsername },
        { key: `app_settings_school_${trimmedUsername}` }
      ]
    });

    if (clientSchool && clientSchool.value) {
      if (verifyPassword(trimmedPassword, clientSchool.value.adminPassword)) {
        const schoolId = clientSchool.schoolId || 'school_brookfield';
        const schoolName = clientSchool.value.schoolName || 'School Principal';
        const cookieStore = await cookies();
        const payload = JSON.stringify({ username: trimmedUsername, role: 'admin', displayName: schoolName, schoolId });
        cookieStore.set('school-session', payload, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return NextResponse.json({ success: true, user: { username: trimmedUsername, role: 'admin', displayName: schoolName, schoolId } });
      } else {
        return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
      }
    }

    // Default legacy admin check
    if (trimmedUsername === 'admin') {
      if (verifyPassword(trimmedPassword, config.adminPassword)) {
        const cookieStore = await cookies();
        const payload = JSON.stringify({ username: 'admin', role: 'admin', displayName: 'Brook Field Principal', schoolId: 'school_brookfield' });
        cookieStore.set('school-session', payload, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return NextResponse.json({ success: true, user: { username: 'admin', role: 'admin', displayName: 'Brook Field Principal', schoolId: 'school_brookfield' } });
      } else {
        return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
      }
    }

    // 3. Check Accountant from MongoDB users collection
    const users = await db.collection('users').find({}).toArray();
    const user = users.find((u: any) => u.username?.toLowerCase() === trimmedUsername);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status === 'blocked') {
      return NextResponse.json({ error: 'Your account has been deactivated by the administrator' }, { status: 403 });
    }

    if (verifyPassword(trimmedPassword, user.password)) {
      const activeSchoolId = user.schoolId || 'school_brookfield';
      const cookieStore = await cookies();
      const payload = JSON.stringify({ username: user.username, role: user.role, displayName: user.displayName, schoolId: activeSchoolId });
      cookieStore.set('school-session', payload, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return NextResponse.json({ success: true, user: { username: user.username, role: user.role, displayName: user.displayName, schoolId: activeSchoolId } });
    } else {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  try {
    const userData = JSON.parse(session.value);
    return NextResponse.json({ authenticated: true, user: userData });
  } catch (e) {
    if (session.value === 'authenticated') {
      return NextResponse.json({ authenticated: true, user: { username: 'admin', role: 'admin', displayName: 'School Administrator' } });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
