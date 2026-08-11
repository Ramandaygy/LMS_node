import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/ortu/ortu.css';

const OrtuChildren = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/ortu/children');
      setChildren(res.data.children || []);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('Gagal memuat data anak.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Memuat data anak...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="ortu-dashboard">
      <main className="dashboard-main">
        <div className="page-header">
          <h2>Data Anak</h2>
          <p>Informasi profil dan biodata anak Anda yang terdaftar di sekolah.</p>
        </div>

        {children.length === 0 ? (
          <div className="info-card">Belum ada data anak yang terhubung ke akun Anda.</div>
        ) : (
          <div className="children-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {children.map((child, index) => (
              <div key={child.id || index} className="card-section" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '24px', fontWeight: 'bold' }}>
                    {child.full_name ? child.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>{child.full_name}</h3>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                      {child.class_name}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>NIS / NISN</span>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{child.nis || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>Jenis Kelamin</span>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{child.gender || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>Email Siswa</span>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{child.email || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>Nomor Telepon</span>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{child.phone || '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrtuChildren;
