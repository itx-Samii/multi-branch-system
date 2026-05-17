import React from 'react';

export default function LicenseBlockedPage() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '550px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '28px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 40px rgba(239, 68, 68, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem'
      }}>
        <div style={{
          width: '84px',
          height: '84px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          fontSize: '3rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)'
        }}>
          🚫
        </div>
        
        <div>
          <span style={{
            display: 'inline-block',
            padding: '0.35rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.75rem',
            borderRadius: '20px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '1rem'
          }}>
            License Deactivated / Blocked
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.025em' }}>
            Software Access Revoked
          </h1>
        </div>

        <p style={{
          color: '#cbd5e1',
          fontSize: '1.05rem',
          lineHeight: 1.6,
          margin: 0,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem 0'
        }}>
          The software license key assigned to this educational institution (<span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700, padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>SCHOOL-PAY-DEMO-KEY-2026</span>) has been suspended or expired by the Master Controller.
        </p>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'left',
          fontSize: '0.9rem',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Developer Contact & Licensing Support:</div>
          <div>✉️ Email: <span style={{ color: '#60a5fa', fontWeight: 600 }}>support@antigravity-erp.com</span></div>
          <div>📞 WhatsApp / Support Line: <span style={{ color: '#60a5fa', fontWeight: 600 }}>+92 (300) 1234567</span></div>
          <div>⚠️ Status Diagnostic: <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>ERR_LICENSE_SUSPENDED</span></div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', letterSpacing: '0.05em' }}>
          Enterprise Cloud Security Architecture • Protected by Antigravity SaaS Engine
        </div>
      </div>
    </div>
  );
}
