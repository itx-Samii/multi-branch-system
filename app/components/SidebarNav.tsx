"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserInfo {
  username: string;
  role: string;
  displayName: string;
  schoolId?: string;
}

export default function SidebarNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>({ username: 'admin', role: 'admin', displayName: 'Administrator', schoolId: 'school_brookfield' });

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/login');
        if (res.ok) {
          const data = await res.json();
          if (data.user) setUser(data.user);
        }
      } catch (e) {
        // ignore
      }
    }
    checkAuth();
  }, []);

  const allLinks = [
    { href: '/superadmin', label: 'Client Licenses (SaaS)', roles: ['superadmin'], icon: '🌍' },
    { href: '/', label: 'Dashboard', roles: ['admin'], icon: '📊' },
    { href: '/collection', label: 'Receive Payment', roles: ['admin', 'accountant'], icon: '💰' },
    { href: '/generate', label: 'Generate Vouchers', roles: ['admin', 'accountant'], icon: '⚡' },
    { href: '/tracking', label: 'Class-wise Tracking', roles: ['admin', 'accountant'], icon: '📈' },
    { href: '/reports', label: 'Financial Reports', roles: ['admin', 'accountant'], icon: '📑' },
    { href: '/expenses', label: 'Expense Manager', roles: ['admin', 'accountant'], icon: '🧾' },
    { href: '/ac-ledger', label: 'AC Ledger', roles: ['admin'], icon: '🏛️' },
    { href: '/salaries', label: 'Salaries Manager', roles: ['admin'], icon: '💵' },
    { href: '/classes', label: 'Classes Management', roles: ['admin'], icon: '🏫' },
    { href: '/students', label: 'All Students', roles: ['admin'], icon: '🎓' },
    { href: '/users', label: 'Users & Roles', roles: ['admin'], icon: '🛡️' },
  ];

  const filteredLinks = allLinks.filter(link => link.roles.includes(user.role));

  const getRoleColor = (r: string) => {
    if (r === 'superadmin') return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (r === 'admin') return 'linear-gradient(135deg, #6366f1, #a855f7)';
    return 'linear-gradient(135deg, #3b82f6, #2dd4bf)';
  };

  const getRoleIcon = (r: string) => {
    if (r === 'superadmin') return '⚡';
    if (r === 'admin') return '👑';
    return '👤';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 'min-content', justifyContent: 'space-between' }}>
      <div>
        {/* User Badge */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.85rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: getRoleColor(user.role),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
          }}>
            {getRoleIcon(user.role)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: user.role === 'superadmin' ? '#f59e0b' : user.role === 'admin' ? '#c084fc' : '#38bdf8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              {user.role} • <span style={{ color: '#94a3b8' }}>{(user.schoolId === 'master' ? 'SaaS Master' : (user.schoolId || 'Brook Field')).replace('school_', '').toUpperCase()}</span>
            </div>
          </div>
        </div>

        <nav style={{display: 'flex', flexDirection: 'column', gap: '0.35rem'}}>
          {filteredLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s',
                  background: isActive ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.2), rgba(79, 70, 229, 0.1))' : 'transparent',
                  borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
                  color: isActive ? 'white' : '#94a3b8'
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem'}}>
        <button 
          onClick={async () => {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) window.location.href = '/login';
          }}
          style={{
            width: '100%',
            padding: '0.85rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#f87171',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
        >
          <span>🔒</span> Secure Logout
        </button>
      </div>
    </div>
  );
}
