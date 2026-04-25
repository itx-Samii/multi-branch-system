"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        // Initialize the tab-based session flag
        sessionStorage.setItem('fms-active-session', 'true');
        // Redirect to dashboard or previous page
        window.location.href = '/'; 
      } else {
        setError('Ghalat Password! Dobara koshish karein.');
      }
    } catch {
      setError('System Error. Please try later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'var(--primary)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h1 style={{fontSize: '1.75rem', marginBottom: '0.5rem'}}>School Pay</h1>
        <p style={{marginBottom: '2rem'}}>Amanat & Hifazat: Please enter your password to gain access.</p>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{textAlign: 'left'}}>
            <label className="form-label">System Password</label>
            <input 
              required
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                textAlign: 'center',
                fontSize: '1.2rem',
                letterSpacing: '0.2em'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontWeight: 600
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1rem',
              marginTop: '1rem'
            }}
          >
            {loading ? 'Verifying...' : 'Unlock System'}
          </button>
        </form>

        <div style={{marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
          Independent Offline Security Mode v1.2.0
        </div>
      </div>
    </div>
  );
}
