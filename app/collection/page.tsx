"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function FeeCollection() {
  const [search, setSearch] = useState('');
  const [feeData, setFeeData] = useState<any>(null);
  const [allFees, setAllFees] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [paidTuition, setPaidTuition] = useState<string>('');
  const [paidAC, setPaidAC] = useState<string>('0');
  
  const [mounted, setMounted] = useState(false);
  const [schoolName, setSchoolName] = useState('TRUST SCHOOL SYSTEM');
  const [schoolAddress, setSchoolAddress] = useState('Campus Address / Contact No');
  const [logo, setLogo] = useState('');

  // Pre-fetch all fees for rapid typeahead searching
  useEffect(() => {
    fetch('/api/fees', { cache: 'no-store' }).then(r => r.json()).then(data => {
      setAllFees(data || []);
    }).catch(console.error);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    setMounted(true);
    setSchoolName(localStorage.getItem('fms-school-name') || 'TRUST SCHOOL SYSTEM');
    setSchoolAddress(localStorage.getItem('fms-school-address') || 'Campus Address / Contact No');
    setLogo(localStorage.getItem('fms-school-logo') || '');
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveName = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const text = e.currentTarget.textContent || 'TRUST SCHOOL SYSTEM';
    setSchoolName(text);
    localStorage.setItem('fms-school-name', text);
  };

  const handleSaveAddress = (e: React.FocusEvent<HTMLParagraphElement>) => {
    const text = e.currentTarget.textContent || 'Campus Address / Contact No';
    setSchoolAddress(text);
    localStorage.setItem('fms-school-address', text);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setFeeData(null);
    setErrorMsg('');

    if (val.trim().length > 0) {
      const match = allFees.filter(f => 
        (f.studentName?.toLowerCase().includes(val.toLowerCase()) ||
        f.fatherName?.toLowerCase().includes(val.toLowerCase()) ||
        f.id.toString() === val) &&
        f.month !== 'Annual Charges' // Hide Annual Charges from this list
      );
      setSuggestions(match.slice(0, 8)); // top 8 matches
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectStudent = (studentFee: any) => {
    setSearch(studentFee.id.toString());
    setFeeData(studentFee);
    setPaidTuition(studentFee.amount.toString());
    setPaidAC((studentFee.remainingAnnualCharges || 0).toString());
    setShowDropdown(false);
    setErrorMsg('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    setLoading(true);
    setErrorMsg('');
    setFeeData(null);
    try {
      const found = allFees.find((f: any) => 
        f.id.toString() === search.toString()
      );

      if (found) {
        setFeeData(found);
        setPaidTuition(found.amount.toString());
        setPaidAC((found.remainingAnnualCharges || 0).toString());
      } else {
        setErrorMsg("No active billing voucher found for this ID.");
      }
    } catch {
      setErrorMsg("System offline or error.");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!feeData) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: feeData.id,
          paidTuition: parseFloat(paidTuition),
          paidAC: parseFloat(paidAC)
        })
      });
      const updated = await res.json();
      if (res.ok) {
        // Correctly sync ALL updated data (status, paymentDate, paidTuition, paidAC, totalReceived)
        setFeeData({ 
          ...feeData, 
          ...updated,
          // Manually update AC balance for instant UI feedback
          remainingAnnualCharges: (feeData.remainingAnnualCharges || 0) - parseFloat(paidAC)
        });
        // trigger print wrapper
        setTimeout(() => window.print(), 300);
      } else {
        alert(updated.error);
      }
    } catch {
      alert("Error processing payment.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{animation: 'fadeIn 0.5s ease-out'}}>
      <h1 className="no-print">Fee Collection Portal</h1>
      <p className="no-print" style={{marginBottom: '2rem'}}>Scan or enter voucher number / student roll number to receive cash.</p>

      <form onSubmit={handleSearch} className="glass-panel no-print" style={{padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', position: 'relative'}}>
        <div style={{flex: 1, position: 'relative'}} ref={dropdownRef}>
          <label className="form-label">Search by Name, Father's Name, or Voucher ID</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Start typing name or father's name..." 
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => { if(suggestions.length > 0) setShowDropdown(true); }}
            style={{fontSize: '1.2rem', padding: '1rem'}}
            autoFocus
            autoComplete="off"
          />
          
          {showDropdown && suggestions.length > 0 && (
            <ul style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
              background: 'var(--bg-card)', border: '1px solid var(--border)', 
              borderRadius: '8px', boxShadow: 'var(--shadow-card)', 
              maxHeight: '300px', overflowY: 'auto', zIndex: 100, listStyle: 'none', margin: '0.25rem 0 0 0', padding: 0
            }}>
              {suggestions.map(s => (
                <li 
                  key={s.id} 
                  onClick={() => selectStudent(s)}
                  className="dropdown-item"
                  style={{padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                >
                  <div>
                    <strong style={{color: 'var(--text-main)', fontSize: '1.05rem'}}>{s.studentName}</strong>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>S/O: {s.fatherName}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Cycle: {s.month} {s.year}</div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <span className={`badge ${s.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                    <div style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)'}}>Class: {s.className}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <button type="submit" className="btn btn-primary" style={{height: '52px', padding: '0 2.5rem'}}>
            {loading ? 'Searching...' : 'Find Record'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="badge badge-danger no-print" style={{padding: '1rem', display: 'block', fontSize: '1rem', marginBottom: '2rem'}}>
          {errorMsg}
        </div>
      )}

      {feeData && (
        <div className="glass-panel receipt-container" style={{padding: '2rem', maxWidth: '600px', margin: '0 auto', background: 'white'}}>
          
          <div className="print-only-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', borderBottom: '2px solid black', paddingBottom: '1rem'}}>
            {logo && <img src={logo} alt="Logo" style={{width: '90px', height: '90px', objectFit: 'contain', marginRight: '15px'}} />}
            <div style={{textAlign: 'center'}}>
              <h2 contentEditable suppressContentEditableWarning onBlur={handleSaveName} style={{fontWeight: 800, margin: 0, outline: 'none', color: '#000'}}>
                {mounted ? schoolName : 'TRUST SCHOOL SYSTEM'}
              </h2>
              <p contentEditable suppressContentEditableWarning onBlur={handleSaveAddress} style={{fontSize: '0.9rem', outline: 'none', color: '#333'}}>
                {mounted ? schoolAddress : 'Campus Address / Contact No'}
              </p>
              <h3 style={{marginTop: '1rem', background: '#000', color: '#fff', display: 'inline-block', padding: '0.2rem 1rem', borderRadius: '4px'}}>OFFICIAL RECEIPT</h3>
            </div>
          </div>

          <div className="no-print" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
            <h2 style={{color: '#000'}}>FEE VOUCHER #{feeData.id}</h2>
            <p style={{color: '#444'}}>Billing Cycle: {feeData.month} {feeData.year}</p>
          </div>

          <div style={{border: '1px solid #ccc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', color: '#000'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem'}}>
              <span style={{color: '#555', fontWeight: 600}}>Receipt No:</span>
              <span style={{fontWeight: 600, color: '#000'}}>#{feeData.id}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem'}}>
              <span style={{color: '#555', fontWeight: 600}}>Date:</span>
              <span style={{fontWeight: 600, color: '#000'}}>{new Date().toLocaleDateString()}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem'}}>
              <span style={{color: '#555', fontWeight: 600}}>Student Name:</span>
              <span style={{fontWeight: 800, fontSize: '1.2rem', color: '#000'}}>{feeData.studentName} S/O {feeData.fatherName}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem'}}>
              <span style={{color: '#555', fontWeight: 600}}>Class:</span>
              <span style={{color: '#000', fontWeight: 700}}>{feeData.className}</span>
            </div>
            <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem'}}>
              <span style={{color: '#555'}}>Current Status:</span>
              <span className={`badge ${feeData.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                {feeData.status}
              </span>
            </div>
            {feeData.totalAnnualCharges > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #eee'}}>
                <span style={{color: '#666', fontSize: '0.85rem'}}>Session AC Balance:</span>
                <span style={{fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem'}}>Rs. {feeData.remainingAnnualCharges}</span>
              </div>
            )}
          </div>

          <div style={{borderTop: '2px dashed #ccc', paddingTop: '1.5rem', marginBottom: '2rem', color: '#000'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#555'}}>
              <span>Base Tuition Fee</span>
              <span style={{color: '#000'}}>Rs. {feeData.baseAmount || feeData.amount}</span>
            </div>
            {feeData.discount > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#059669'}}>
                <span>Scholarship/Discount</span>
                <span>- Rs. {feeData.discount}</span>
              </div>
            )}
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#555'}}>
              <span>Monthly Portion</span>
              <span style={{color: '#000'}}>Rs. {feeData.status === 'Paid' ? (feeData.paidTuition || feeData.amount) : paidTuition}</span>
            </div>

            {( (feeData.status === 'Paid' && feeData.paidAC > 0) || (feeData.status === 'Unpaid' && parseFloat(paidAC) > 0) ) && (
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--primary)'}}>
                <span>Annual Charges (AC)</span>
                <span style={{fontWeight: 600}}>+ Rs. {feeData.status === 'Paid' ? feeData.paidAC : paidAC}</span>
              </div>
            )}
            
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800, borderTop: '1px solid #ccc', paddingTop: '1rem', color: '#000'}}>
              <span>TOTAL RECEIVED</span>
              <span>Rs. {feeData.status === 'Paid' ? (feeData.totalReceived || feeData.amount) : (parseFloat(paidTuition || '0') + parseFloat(paidAC || '0'))}</span>
            </div>
          </div>
          
          <div className="print-only-footer" style={{marginTop: '4rem', display: 'flex', justifyContent: 'space-between', color: '#000'}}>
            <div style={{borderTop: '1px solid black', width: '40%', textAlign: 'center', paddingTop: '0.5rem'}}>Accountant Signature</div>
            <div style={{borderTop: '1px solid black', width: '40%', textAlign: 'center', paddingTop: '0.5rem'}}>Depositor Signature</div>
          </div>

          <div className="no-print" style={{marginTop: '2rem'}}>
            {feeData.status === 'Unpaid' ? (
              <>
                <div className="glass-panel no-print" style={{padding: '1.25rem', background: '#f8fafc', marginBottom: '1.5rem', border: '1px solid #cbd5e1'}}>
                  <h4 style={{marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1rem'}}>Payment Breakdown</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label className="form-label" style={{fontSize: '0.8rem'}}>RECEIVE FEE (RS.)</label>
                      <input type="number" className="form-input" value={paidTuition} onChange={e => setPaidTuition(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{fontSize: '0.8rem'}}>RECEIVE AC (RS.)</label>
                      <input type="number" className="form-input" value={paidAC} onChange={e => setPaidAC(e.target.value)} />
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary no-print" onClick={handlePay} disabled={processing} style={{width: '100%', padding: '1.25rem', fontSize: '1.1rem'}}>
                  {processing ? 'Processing...' : `Confirm Receipt (Rs. ${parseFloat(paidTuition || '0') + parseFloat(paidAC || '0')})`}
                </button>
              </>
            ) : (
               <div style={{textAlign: 'center'}}>
                 <p style={{color: 'var(--success)', fontWeight: 'bold', marginBottom: '1rem'}}>
                   ✓ Payment received on {new Date(feeData.paymentDate).toLocaleDateString()}
                 </p>
                 <button className="btn btn-secondary no-print" onClick={() => window.print()}>Print Duplicate Receipt</button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
