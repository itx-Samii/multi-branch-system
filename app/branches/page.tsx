"use client";
import React, { useState, useEffect } from 'react';

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);

      // Fetch student count per branch
      const countsRes = await fetch('/api/students?limit=10000&branchId=all');
      const countsData = await countsRes.json();
      const students = countsData.data || countsData.students || [];
      const counts: Record<string, number> = {};
      students.forEach((s: any) => {
        const bid = s.branchId || 'branch_main';
        counts[bid] = (counts[bid] || 0) + 1;
      });
      setStudentCounts(counts);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  const openAdd = () => {
    setEditBranch(null);
    setForm({ name: '', code: '', address: '', phone: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (branch: any) => {
    setEditBranch(branch);
    setForm({ name: branch.name, code: branch.code, address: branch.address || '', phone: branch.phone || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = editBranch ? 'PUT' : 'POST';
      const body = editBranch
        ? { id: editBranch.id, ...form }
        : { ...form };
      const res = await fetch('/api/branches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
      setShowModal(false);
      fetchBranches();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: any) => {
    if (branch.isDefault) { alert('Cannot delete the Main Campus / default branch.'); return; }
    if (!confirm(`Delete branch "${branch.name}"? All its data will remain isolated in the database but this branch entry will be removed.`)) return;
    await fetch(`/api/branches?id=${branch.id}`, { method: 'DELETE' });
    fetchBranches();
  };

  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>📍 Campus & Branch Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage all campuses and branches for this school. Data is strictly isolated per branch — zero clashes guaranteed.
          </p>
        </div>
        <button id="add-branch-btn" className="btn btn-primary" onClick={openAdd} style={{ whiteSpace: 'nowrap' }}>
          ➕ Add New Branch
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Branches</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>{branches.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Students</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)' }}>{totalStudents}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Active Branches</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--warning)' }}>{branches.length}</div>
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No branches found</div>
          <p style={{ marginTop: '0.5rem' }}>Click "Add New Branch" to create your first campus!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {branches.map((branch) => {
            const count = studentCounts[branch.branchId || branch.id] || 0;
            return (
              <div key={branch.id} className="glass-panel" style={{
                padding: '1.75rem',
                borderLeft: `5px solid ${branch.isDefault ? 'var(--primary)' : 'var(--success)'}`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative BG code */}
                <div style={{
                  position: 'absolute', top: '1rem', right: '1.25rem',
                  fontSize: '3.5rem', fontWeight: 900, opacity: 0.06,
                  color: 'var(--text-main)', userSelect: 'none', letterSpacing: '-0.05em',
                }}>{branch.code}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{branch.isDefault ? '🏫' : '🏢'}</span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{branch.name}</h3>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      background: branch.isDefault ? 'var(--primary-light)' : 'var(--success-bg)',
                      color: branch.isDefault ? 'var(--primary)' : 'var(--success)',
                      border: `1px solid ${branch.isDefault ? 'var(--primary)' : 'var(--success)'}`,
                      padding: '0.15rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {branch.isDefault ? '✅ Main Campus' : `Code: ${branch.code}`}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'var(--bg-body)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{count}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Students</div>
                  </div>
                  <div style={{ background: 'var(--bg-body)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>✓</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active</div>
                  </div>
                </div>

                {(branch.address || branch.phone) && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {branch.address && <div>📍 {branch.address}</div>}
                    {branch.phone && <div style={{ marginTop: '0.25rem' }}>📞 {branch.phone}</div>}
                  </div>
                )}

                {/* Branch ID badge */}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem', fontFamily: 'monospace', background: 'var(--bg-body)', padding: '0.4rem 0.7rem', borderRadius: '6px' }}>
                  🔑 ID: {branch.branchId || branch.id}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    id={`edit-branch-${branch.id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
                    onClick={() => openEdit(branch)}
                  >✏️ Edit</button>
                  {!branch.isDefault && (
                    <button
                      id={`delete-branch-${branch.id}`}
                      className="btn btn-danger"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                      onClick={() => handleDelete(branch)}
                    >🗑️</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data Isolation Notice */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--primary)', background: 'var(--primary-light)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
          🛡️ Zero Data Clash Architecture
        </div>
        <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Each branch stores data with a compound identifier (<code>schoolId + branchId</code>) in MongoDB. Even if two branches have a student with the same Roll Number or Admission Number, they remain completely isolated and will never clash. Fee Collection Hub allows cross-branch fee submission by selecting the appropriate campus filter.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editBranch ? '✏️ Edit Branch' : '➕ Add New Branch'}</h2>
            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Branch / Campus Name *</label>
                <input id="branch-name-input" className="form-input" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. North Campus, Junior Block" />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Code *</label>
                <input id="branch-code-input" className="form-input" required value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. NC, JB, MB" maxLength={8}
                  disabled={!!editBranch?.isDefault} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Short uppercase code. Used for internal data isolation.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input id="branch-address-input" className="form-input" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Branch address (optional)" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input id="branch-phone-input" className="form-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Branch contact number (optional)" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="save-branch-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : (editBranch ? '💾 Save Changes' : '➕ Add Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
