"use client";
import React, { useState, useEffect } from 'react';

interface SaaSClient {
  id: string;
  schoolId: string;
  clientName: string;
  licenseKey: string;
  status: string;
  maxStudents: number;
  currentStudents: number;
  createdAt: string;
  lastSync: string;
}

export default function SuperAdminPage() {
  const [clients, setClients] = useState<SaaSClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [maxStudents, setMaxStudents] = useState('1000');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('principal123');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<SaaSClient | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editLicenseKey, setEditLicenseKey] = useState('');
  const [editMaxStudents, setEditMaxStudents] = useState('1000');
  const [editAdminPassword, setEditAdminPassword] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      } else {
        setError('Unauthorized: Master Super Admin credentials required.');
      }
    } catch {
      setError('System network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/superadmin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, licenseKey, maxStudents, adminUsername: adminUsername || 'admin', adminPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Client ${clientName} successfully provisioned! School ID: ${data.client?.schoolId}`);
        setShowModal(false);
        setClientName('');
        setLicenseKey('');
        setAdminUsername('');
        setAdminPassword('principal123');
        fetchClients();
      } else {
        setError(data.error || 'Failed to create SaaS client.');
      }
    } catch {
      setError('System network error.');
    }
  };

  const openEditModal = (client: SaaSClient) => {
    setEditingClient(client);
    setEditClientName(client.clientName || '');
    setEditLicenseKey(client.licenseKey || '');
    setEditMaxStudents(client.maxStudents?.toString() || '1000');
    setEditAdminPassword('');
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/superadmin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClient.id,
          clientName: editClientName,
          maxStudents: editMaxStudents,
          licenseKey: editLicenseKey,
          adminPassword: editAdminPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Client profile and limit successfully updated!`);
        setShowEditModal(false);
        setEditingClient(null);
        fetchClients();
      } else {
        setError(data.error || 'Failed to modify SaaS client.');
      }
    } catch {
      setError('System network error.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const actionText = newStatus === 'blocked' ? 'DEACTIVATE / BLOCK' : 'ACTIVATE';
    if (!window.confirm(`Are you sure you want to ${actionText} license for ${name}?`)) return;

    try {
      const res = await fetch('/api/superadmin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        setSuccess(`Client license ${newStatus.toUpperCase()} successfully.`);
        fetchClients();
      } else {
        setError('Failed to update client license state.');
      }
    } catch {
      setError('System network error.');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`PERMANENT DELETION: Are you sure you want to remove SaaS record for ${name}?`)) return;
    try {
      const res = await fetch(`/api/superadmin/clients?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Client record removed.');
        fetchClients();
      }
    } catch {
      setError('Failed to delete client.');
    }
  };

  const activeCount = clients.filter(c => c.status === 'active').length;
  const blockedCount = clients.filter(c => c.status === 'blocked').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1250px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              SAAS CLOUD MASTER CONTROLLER
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>v14.8 Enterprise Engine</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🌍</span> Client Software Licensing & SaaS Portal
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#cbd5e1', fontSize: '1rem', maxWidth: '650px' }}>
            As the Super Admin (Software Developer & Owner), you have master cutoff capability over all distributed client school instances.
          </p>
        </div>
        <button
          onClick={() => {
            setLicenseKey(`KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${new Date().getFullYear()}`);
            setShowModal(true);
          }}
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#b45309', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.5rem', fontSize: '1.05rem', fontWeight: 700, borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}
        >
          <span>⚡</span> Issue New License
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🏫
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Distributed Clients</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white' }}>{clients.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🟢
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Installations</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#22c55e' }}>{activeCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🚫
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Blocked / Cutoff Clients</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ef4444' }}>{blockedCount}</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: '12px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', padding: '1rem', borderRadius: '12px', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* SaaS Clients Table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📜</span> Master Client Directory
        </h2>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1rem' }}>Loading SaaS client databases...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No licensed client schools found. Click "Issue New License" to onboard a school.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>School / Client Name</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>School ID (Tenant Slug)</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>License Key</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>Student Usage</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>Licensing Status</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700 }}>Provisioned Date</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>Master Remote Control</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.35rem 1rem', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{c.clientName}</td>
                    <td style={{ padding: '1.35rem 1rem', fontFamily: 'monospace', fontSize: '0.95rem', color: '#c084fc' }}>{c.schoolId || c.id || 'school_brookfield'}</td>
                    <td style={{ padding: '1.35rem 1rem', fontFamily: 'monospace', fontSize: '1.05rem', color: '#38bdf8', letterSpacing: '0.05em' }}>{c.licenseKey}</td>
                    <td style={{ padding: '1.35rem 1rem' }}>
                       <div style={{ fontSize: '0.85rem', fontWeight: 700, color: (c.currentStudents || 0) >= c.maxStudents ? '#ef4444' : '#22c55e', marginBottom: '4px' }}>
                         {c.currentStudents ?? 0} / {c.maxStudents}
                       </div>
                       <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', width: '80px' }}>
                         <div style={{ height: '100%', width: `${Math.min(100, Math.round(((c.currentStudents || 0) / c.maxStudents) * 100))}%`, background: (c.currentStudents || 0) >= c.maxStudents ? '#ef4444' : (c.currentStudents || 0) >= c.maxStudents * 0.8 ? '#f59e0b' : '#22c55e', borderRadius: '3px', transition: 'width 0.4s' }} />
                       </div>
                     </td>
                    <td style={{ padding: '1.35rem 1rem' }}>
                      <span style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '20px',
                        border: c.status === 'active' ? '1px solid #22c55e' : '1px solid #ef4444',
                        background: c.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.status === 'active' ? '#22c55e' : '#ef4444',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: c.status === 'active' ? '0 0 10px rgba(34, 197, 94, 0.2)' : '0 0 10px rgba(239, 68, 68, 0.2)'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.status === 'active' ? '#22c55e' : '#ef4444' }}></span>
                        {c.status === 'active' ? 'ACTIVE (OPERATIONAL)' : 'SUSPENDED / BLOCKED'}
                      </span>
                    </td>
                    <td style={{ padding: '1.35rem 1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1.35rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEditModal(c)}
                          className="btn"
                          style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}
                          title="Modify SaaS Limit & Profile"
                        >
                          ✏️ Modify
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c.id, c.status, c.clientName)}
                          className="btn"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            background: c.status === 'active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: c.status === 'active' ? '#f87171' : '#4ade80',
                            border: c.status === 'active' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {c.status === 'active' ? '🚫 Deactivate' : '⚡ Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClient(c.id, c.clientName)}
                          className="btn"
                          style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.08)' }}
                          title="Permanently Delete Client Record"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisioning Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>⚡</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'white' }}>Issue School License</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.75rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>CLIENT / SCHOOL NAME</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Beaconhouse School System"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>PRINCIPAL LOGIN USERNAME</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. admin_beaconhouse"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>INITIAL PRINCIPAL PASSWORD</label>
                <input
                  required
                  type="text"
                  placeholder="principal123"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>SOFTWARE LICENSE KEY</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    required
                    type="text"
                    className="form-input"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setLicenseKey(`KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${new Date().getFullYear()}`)}
                    className="btn"
                    style={{ padding: '0 1rem', background: 'rgba(255, 255, 255, 0.1)', fontWeight: 600 }}
                    title="Generate Random Key"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>MAX STUDENTS CAPACITY</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn"
                  style={{ padding: '0.85rem 1.5rem', background: 'rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#b45309', padding: '0.85rem 1.75rem', fontWeight: 700, fontSize: '1.05rem', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}
                >
                  Confirm & Provision License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify / Edit Modal */}
      {showEditModal && editingClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>✏️</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'white' }}>Modify School License & Profile</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.75rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>CLIENT / SCHOOL NAME</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>SOFTWARE LICENSE KEY</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 700 }}
                  value={editLicenseKey}
                  onChange={(e) => setEditLicenseKey(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>MAX STUDENTS CAPACITY</label>
                <input
                  required
                  type="number"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={editMaxStudents}
                  onChange={(e) => setEditMaxStudents(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Limits the maximum number of students this school can enroll.
                </span>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>RESET PRINCIPAL PASSWORD (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="Leave blank to keep unchanged"
                  className="form-input"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '1.05rem' }}
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn"
                  style={{ padding: '0.85rem 1.5rem', background: 'rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderColor: '#1e40af', padding: '0.85rem 1.75rem', fontWeight: 700, fontSize: '1.05rem', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
