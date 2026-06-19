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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 'bold', margin: '0 0 8px 0' }}>Data Anak Saya</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Informasi profil anak yang terhubung dengan akun Anda</p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat data...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '20px' }}>
          {children.length > 0 ? (
            children.map(child => (
              <div key={child.id} style={{ 
                padding: '24px', 
                background: 'white', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#eff6ff', 
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>face</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>{child.full_name}</h3>
                  <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}>
                    <strong>NIS:</strong> {child.nis || '-'}
                  </div>
                  <div style={{ color: '#475569', fontSize: '14px' }}>
                    <strong>Kelas:</strong> {child.class_name || 'Tidak ada kelas'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '40px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
              Belum ada data anak yang tertaut dengan akun Anda. Hubungi administrator sekolah.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrtuChildren;
