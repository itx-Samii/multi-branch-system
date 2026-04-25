"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AuthGuard() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Skip check on login page
    if (pathname === '/login') return;

    // 2. Check for the session storage flag
    // sessionStorage is cleared when the tab or window is closed.
    // If the flag is missing, it means this is a new tab or the window was closed.
    const hasActiveSession = sessionStorage.getItem('fms-active-session');

    if (!hasActiveSession) {
      // Missing session flag, force logout to clear the server-side cookie
      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        window.location.href = '/login';
      });
    }
  }, [pathname]);

  return null;
}
