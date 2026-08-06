import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const OrtuChildren = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/attendance/ortu/children');
      setChildren(res.data.children || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '80vh' }}>
      <div style={{ marginBottom: '32px', textAlign: 'left' }}>
        <h2 style={{ fontSize: '32px', color: '#1e293b', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-0.025em' }}>Data Anak Saya</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px', fontWeight: '500' }}>Informasi profil akademik putra-putri yang terdaftar dan terhubung di LMS</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>Memuat data anak...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
          {children.length > 0 ? (
            children.map(child => (
              <div key={child.id} style={{ 
                padding: '28px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderRadius: '24px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)';
              }}
              >
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '38px' }}>face</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '20px', fontWeight: '800' }}>{child.full_name}</h3>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>NIS:</span> {child.nis}
                  </div>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>Kelas:</span> 
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {child.class_name || 'Tidak ada kelas'}
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>Email:</span> {child.email}
                  </div>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>No HP:</span> {child.phone}
                  </div>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>Kelamin:</span> {child.gender}
                  </div>
                  <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>Alamat:</span> {child.address}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '60px 40px', background: 'white', borderRadius: '24px', border: '2px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }}>person_off</span>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Belum ada data anak yang tertaut dengan akun Anda.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>Silakan hubungi administrator sekolah untuk menghubungkan NIS anak.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrtuChildren;
