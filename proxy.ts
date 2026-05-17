import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('school-session');
  const { pathname } = request.nextUrl;

  // 1. Allow login page, license blocked page, and auth APIs
  if (pathname === '/login' || pathname === '/license-blocked' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. Allow static files (public assets, _next/static, etc)
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 3. If no session, redirect to login
  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-based Route Protection
  let user: { username: string; role: string; displayName: string } = {
    username: 'admin',
    role: 'admin',
    displayName: 'Administrator'
  };

  if (session.value !== 'authenticated') {
    try {
      user = JSON.parse(session.value);
    } catch (e) {
      // fallback to admin if unparseable
    }
  }

  if (user.role === 'accountant') {
    // If Accountant navigates to root Dashboard, redirect directly to Receive Payment page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/collection', request.url));
    }

    // BLOCKED routes for Accountant
    const blockedPrefixes = [
      '/superadmin',
      '/students',
      '/classes',
      '/salaries',
      '/ac-ledger',
      '/users',
      '/api/superadmin',
      '/api/admin',
      '/api/users',
      '/api/salaries',
      '/api/staff'
    ];

    const isBlocked = blockedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (isBlocked) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Access Denied: Your role (Accountant) does not have permission to perform this action.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // School Admin should not access SaaS Super Admin portal
  if (user.role === 'admin' && (pathname === '/superadmin' || pathname.startsWith('/superadmin/') || pathname.startsWith('/api/superadmin'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Access Denied: Super Admin access required.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
