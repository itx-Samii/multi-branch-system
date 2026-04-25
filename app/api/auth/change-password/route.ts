import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/fileHandler';

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();
    const trimmedOld = oldPassword?.trim();
    const trimmedNew = newPassword?.trim();
    const config = await readConfig();

    if (config.adminPassword !== trimmedOld) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    config.adminPassword = trimmedNew;
    await writeConfig(config);

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
