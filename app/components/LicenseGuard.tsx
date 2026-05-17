"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function LicenseGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/license-blocked' || pathname === '/login') return;

    const checkLicense = async () => {
      try {
        const res = await fetch('/api/admin/license');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'blocked') {
            window.location.href = '/license-blocked';
          }
        }
      } catch (e) {
        // network offline grace period
      }
    };

    checkLicense();
    const interval = setInterval(checkLicense, 60_000); // Check every minute
    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
