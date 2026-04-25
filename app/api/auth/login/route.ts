import { NextResponse } from 'next/server';
import { readConfig } from '@/lib/fileHandler';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const trimmedPassword = password?.trim();
    const config = await readConfig();

    if (trimmedPassword === config.adminPassword) {
      // Set a session cookie
      const cookieStore = await cookies();
      cookieStore.set('school-session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
        // Removed maxAge to make it a session-only cookie
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('school-session');
  if (session?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
