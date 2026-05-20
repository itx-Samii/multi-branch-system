import { NextResponse } from 'next/server';
import { readData, writeData, hashPassword } from '@/lib/dbHandler';
import { cookies } from 'next/headers';

const FILE_NAME = 'users.json';

async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (!session?.value) return { auth: false, schoolId: 'school_brookfield' };
  try {
    const user = JSON.parse(session.value);
    const schoolId = user.schoolId || 'school_brookfield';
    const isAuthorized = user.role === 'admin' || user.role === 'superadmin';
    return { auth: isAuthorized, schoolId };
  } catch (e) {
    return { auth: false, schoolId: 'school_brookfield' };
  }
}

export async function GET() {
  const adminMeta = await checkAdmin();
  if (!adminMeta.auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { schoolId } = adminMeta;

  try {
    let users = await readData<any>(FILE_NAME, schoolId);

    if (users.length === 0) {
      const defaultAccountant = {
        id: 1,
        username: `accountant_${schoolId.replace('school_', '')}`,
        password: hashPassword('accountant123'),
        displayName: 'Senior Accountant',
        role: 'accountant',
        status: 'active',
        schoolId,
        createdAt: new Date().toISOString()
      };
      await writeData(FILE_NAME, [defaultAccountant], schoolId);
      users = [defaultAccountant];
    }

    const cleanUsers = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt
    }));

    return NextResponse.json(cleanUsers);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminMeta = await checkAdmin();
  if (!adminMeta.auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { schoolId } = adminMeta;

  try {
    const body = await request.json();
    const { username, password, displayName, role, branchId } = body;

    const trimmedUsername = username?.trim()?.toLowerCase();
    if (!trimmedUsername || !password || !displayName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (trimmedUsername === 'admin' || trimmedUsername === 'superadmin') {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
    }

    const users = await readData<any>(FILE_NAME, schoolId);
    if (users.some((u: any) => u.username?.toLowerCase() === trimmedUsername)) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const maxId = users.length > 0 ? Math.max(...users.map((u: any) => u.id || 0)) : 0;
    const resolvedRole = role || 'accountant';
    const newUser: any = {
      id: maxId + 1,
      username: trimmedUsername,
      password: hashPassword(password),
      displayName: displayName.trim(),
      role: resolvedRole,
      status: 'active',
      schoolId,
      createdAt: new Date().toISOString()
    };

    if (resolvedRole === 'accountant' && branchId) {
      newUser.branchId = branchId;
    }

    const updatedUsers = [...users, newUser];
    await writeData(FILE_NAME, updatedUsers, schoolId);

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName, role: newUser.role, status: newUser.status } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminMeta = await checkAdmin();
  if (!adminMeta.auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { schoolId } = adminMeta;

  try {
    const body = await request.json();
    const { id, status, password, displayName, username } = body;

    const users = await readData<any>(FILE_NAME, schoolId);
    const userIndex = users.findIndex((u: any) => u.id?.toString() === id?.toString());

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (status) users[userIndex].status = status;
    if (displayName) users[userIndex].displayName = displayName;
    if (username && username.trim()) {
      const trimmed = username.trim().toLowerCase();
      if (trimmed === 'admin' || trimmed === 'superadmin') {
        return NextResponse.json({ error: 'Username is reserved' }, { status: 400 });
      }
      const duplicate = users.find((u: any) => u.username === trimmed && u.id?.toString() !== id?.toString());
      if (duplicate) {
        return NextResponse.json({ error: `Username "${trimmed}" is already taken` }, { status: 400 });
      }
      users[userIndex].username = trimmed;
    }
    if (password && password.trim().length > 0) {
      users[userIndex].password = hashPassword(password);
    }

    await writeData(FILE_NAME, users, schoolId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminMeta = await checkAdmin();
  if (!adminMeta.auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { schoolId } = adminMeta;

  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '0', 10);

    const users = await readData<any>(FILE_NAME, schoolId);
    const updatedUsers = users.filter((u: any) => u.id?.toString() !== id?.toString());

    if (users.length === updatedUsers.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await writeData(FILE_NAME, updatedUsers, schoolId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
