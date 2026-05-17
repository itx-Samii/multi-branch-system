import { NextResponse } from 'next/server';
import { readConfig, writeConfig, verifyPassword, hashPassword } from '@/lib/dbHandler';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();
    const trimmedOld = oldPassword?.trim();
    const trimmedNew = newPassword?.trim();

    if (!trimmedOld || !trimmedNew) {
      return NextResponse.json({ error: 'Both old and new passwords are required' }, { status: 400 });
    }

    if (trimmedNew.length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 characters' }, { status: 400 });
    }

    // Extract schoolId from session cookie so each tenant updates THEIR own config
    let schoolId = 'school_brookfield';
    try {
      const cookieStore = await cookies();
      const session = cookieStore.get('school-session');
      if (session?.value) {
        const user = JSON.parse(session.value);
        if (user?.schoolId) schoolId = user.schoolId;
      }
    } catch {}

    const config = await readConfig(schoolId);

    if (!verifyPassword(trimmedOld, config.adminPassword)) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    // Store the new password as a secure hash
    config.adminPassword = hashPassword(trimmedNew);
    await writeConfig(config, schoolId);

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
