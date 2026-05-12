import { NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/firestore';
import { verifyPassword, hashPassword } from '@/lib/fileHandler';

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();
    const trimmedOld = oldPassword?.trim();
    const trimmedNew = newPassword?.trim();

    if (!trimmedOld || !trimmedNew) {
      return NextResponse.json(
        { error: 'Both old and new passwords are required' },
        { status: 400 }
      );
    }

    if (trimmedNew.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const config = await getConfig();

    if (!verifyPassword(trimmedOld, config.adminPassword)) {
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    // Hash and store the new password in Firestore
    await setConfig({ ...config, adminPassword: hashPassword(trimmedNew) });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
