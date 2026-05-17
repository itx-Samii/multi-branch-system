import Link from 'next/link';

export default function UnauthorizedPage() {
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
        maxWidth: '500px',
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
          fontSize: '3.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)'
        }}>
          🔒
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
            RBAC Authorization Guard
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.025em' }}>
            Access Restricted
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
          Your active account credentials do not have permission to access this administrative module. Please contact your School Principal or Super Admin if you require escalated privileges.
        </p>

        <div style={{ paddingTop: '0.5rem' }}>
          <Link
            href="/collection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.9rem 2.25rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '1.05rem',
              textDecoration: 'none',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
              border: '1px solid #60a5fa',
              transition: 'all 0.2s'
            }}
          >
            Return to Active Dashboard
          </Link>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', letterSpacing: '0.05em' }}>
          Enterprise Cloud Security Architecture • Protected by Antigravity RBAC Guard
        </div>
      </div>
    </div>
  );
}
