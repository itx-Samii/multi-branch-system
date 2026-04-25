"use client";
import React, { useState, useEffect } from 'react';

export default function GenerateFees() {
  const [fees, setFees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [schoolName, setSchoolName] = useState('YOUR SCHOOL NAME');
  const [logo, setLogo] = useState('');
  const [printTargetId, setPrintTargetId] = useState<number | null>(null);

  const handlePrintIndividual = (id: number) => {
    setPrintTargetId(id);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();

  const fetchMonthFees = async () => {
    const res = await fetch(`/api/fees?month=${currentMonth}&year=${currentYear}`, { cache: 'no-store' });
    const data = await res.json();
    setFees(data || []);
  };

  useEffect(() => {
    setMounted(true);
    setSchoolName(localStorage.getItem('fms-school-name') || 'YOUR SCHOOL NAME');
    setLogo(localStorage.getItem('fms-school-logo') || '');
    fetchMonthFees();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setLogo(result);
        try {
          localStorage.setItem('fms-school-logo', result);
        } catch(e) {
          alert('Image too large for local storage! Please select a smaller logo (under 2MB).');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const text = e.currentTarget.textContent || 'YOUR SCHOOL NAME';
    setSchoolName(text);
    localStorage.setItem('fms-school-name', text);
  };


  const filteredFees = fees.filter(f => 
    f.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.fatherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.id.toString() === searchQuery
  );

  const calculateTotal = () => filteredFees.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={{animation: 'fadeIn 0.5s ease-out'}}>
      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem'}}>
        <div>
          <h1>Print Student Challans</h1>
          <p>Search and print dynamic fee vouchers for {currentMonth} {currentYear}.</p>
        </div>
      </div>

      <div className="no-print" style={{marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>Active Vouchers: {filteredFees.length} | Expected Total: Rs. {calculateTotal()}</h2>
        <input 
          type="text" 
          placeholder="Search Name or Father's Name..." 
          className="form-input" 
          style={{maxWidth: '350px'}}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredFees.length === 0 ? (
        <div className="glass-panel no-print" style={{padding: '4rem', textAlign: 'center'}}>
          <h3 style={{color: 'var(--text-muted)'}}>{fees.length > 0 ? "No vouchers match your search." : "No vouchers generated for this billing cycle yet."}</h3>
        </div>
      ) : (
        <>
          <div className="no-print" style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)'}}>
            <strong style={{color: 'var(--text-main)'}}>Upload School Logo:</strong>
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{fontSize: '0.9rem'}} />
            {logo && <button className="btn btn-secondary" onClick={() => {setLogo(''); localStorage.removeItem('fms-school-logo');}} style={{padding: '0.5rem'}}>Remove Logo</button>}
          </div>

          <div className="glass-panel table-container no-print">
            <table className="table">
              <thead>
                <tr>
                  <th style={{width: '80px'}}>Sr No</th>
                  <th>Student & Father Name</th>
                  <th>Class</th>
                  <th>Month</th>
                  <th>Base Fee</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((f, idx) => (
                  <tr key={f.id}>
                    <td style={{color: 'var(--text-muted)'}}>#{idx + 1}</td>
                    <td>
                      <div style={{fontWeight: 'bold'}}>{f.studentName}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>S/O: {f.fatherName}</div>
                    </td>
                    <td style={{fontSize: '0.85rem'}}>{f.className}</td>
                    <td>{f.month} {f.year}</td>
                    <td>Rs. {f.amount}</td>
                    <td><span className={`badge ${f.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span></td>
                    <td>
                      <button 
                         className="btn btn-primary" 
                         style={{padding: '0.3rem 0.8rem', fontSize: '0.8rem'}}
                         onClick={() => handlePrintIndividual(f.id)}
                      >
                         Print Challan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-container print-only">
            {(printTargetId ? filteredFees.filter(f => f.id === printTargetId) : []).map(f => (
              <div key={f.id} className="voucher-card" style={{breakAfter: 'page', marginBottom: '2rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', background: 'white', color: 'black', padding: '1rem', border: '1px solid #000'}}>
                  {['Bank Copy', 'School Copy', 'Student Copy'].map((copy, i) => (
                    <div key={copy} style={{flex: '1', padding: '0 1.5rem', borderRight: i < 2 ? '1px dashed #000' : 'none', color: '#000'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', textAlign: 'center'}}>
                        {logo && <img src={logo} alt="Logo" style={{width: '50px', height: '50px', objectFit: 'contain', marginRight: '10px'}} />}
                        <div>
                          <h3 
                            contentEditable suppressContentEditableWarning 
                            onBlur={handleSaveName}
                            style={{fontWeight: 800, margin: 0, textTransform: 'uppercase', outline: 'none', borderBottom: '1px dotted transparent', color: '#000'}}
                            aria-label="Editable School Name"
                          >
                            {mounted ? schoolName : 'YOUR SCHOOL NAME'}
                          </h3>
                          <p style={{fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', padding: '0.2rem', border: '1px solid #000', color: '#000'}}>{copy}</p>
                        </div>
                      </div>
                      
                      <div style={{fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between'}}>
                        <strong>Voucher No:</strong> 
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none'}}>#{f.id}</span>
                      </div>
                      <div style={{fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between'}}>
                        <strong>Month:</strong> 
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none'}}>{f.month} {f.year}</span>
                      </div>
                      <div style={{fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between'}}>
                        <strong>Name:</strong> 
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none'}}>{f.studentName}</span>
                      </div>
                      <div style={{fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between'}}>
                        <strong>Father Name:</strong> 
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none', fontWeight: 600}}>{f.fatherName}</span>
                      </div>
                      <div style={{fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between'}}>
                        <strong>Class:</strong> 
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none', fontWeight: 700}}>{f.className}</span>
                      </div>
                      
                      <div style={{borderTop: '2px solid #000', margin: '1rem 0'}}></div>

                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                        <span>Tuition Fee</span>
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none'}}>Rs. {f.baseAmount || f.amount}</span>
                      </div>
                      
                      {f.discount > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                          <span>Discount</span>
                          <span>- Rs. {f.discount}</span>
                        </div>
                      )}
                      
                      {f.remainingAnnualCharges > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c2410c', background: '#fff7ed', padding: '0.2rem'}}>
                          <strong>O/S Annual Charges:</strong>
                          <strong>Rs. {f.remainingAnnualCharges}</strong>
                        </div>
                      )}

                      <div style={{borderTop: '2px dashed #000', margin: '1rem 0'}}></div>

                      <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem'}}>
                        <span>NET AMOUNT</span>
                        <span contentEditable suppressContentEditableWarning style={{outline: 'none'}}>Rs. {f.amount}</span>
                      </div>
                      
                      <div style={{marginTop: '4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem'}}>
                        <div style={{borderTop: '1px solid black', paddingTop: '0.2rem', width: '45%', textAlign: 'center'}}>Cashier Stamp</div>
                        <div style={{borderTop: '1px solid black', paddingTop: '0.2rem', width: '45%', textAlign: 'center'}}>Officer Sign</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
