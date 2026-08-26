import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin.css';

const BkMainDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0,
    total_classes: 0,
    total_high_risk: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const commandCards = [
    { id: 1, title: 'Daftar Hadir', description: 'Input dan rekap presensi siswa per kelas.', icon: 'event_available', path: '/dashboard/bk/attendance', borderLeft: '#10b981', iconBg: '#ecfdf5', iconColor: '#059669' },
    { id: 2, title: 'Pantau Siswa (EWS)', description: 'Pantau risiko akademik dan leger nilai siswa.', icon: 'psychology', path: '/dashboard/bk/monitoring', borderLeft: '#ef4444', iconBg: '#fef2f2', iconColor: '#dc2626' },
    { id: 3, title: 'Kalender Akademik', description: 'Lihat agenda sekolah dan jadwal ujian.', icon: 'event', path: '/dashboard/admin/calendar', borderLeft: '#8b5cf6', iconBg: '#f5f3ff', iconColor: '#7c3aed' }
  ];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard BK...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-modern" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <section className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="header-badge" style={{ alignSelf: 'flex-start', background: '#fffbeb', color: '#d97706', padding: '6px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          DASHBOARD GURU BK
        </span>
        <h2 className="header-title" style={{ fontSize: '32px', color: '#0f172a', fontWeight: '800', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Pusat Bimbingan & Konseling
        </h2>
        <p className="header-subtitle" style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
          Pantau kedisiplinan dan risiko akademik siswa (EWS) secara menyeluruh.
        </p>
      </section>

      {/* Bento Grid Metrics */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Siswa Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#2563eb' }}>school</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_students}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Siswa</p>
        </div>

        {/* Kelas Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#4f46e5' }}>class</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_classes}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Kelas</p>
        </div>

        {/* High Risk Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#ef4444' }}>warning</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_high_risk}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Siswa High Risk</p>
        </div>
      </div>

      {/* Control Center */}
      <div className="commands-section" style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
        <h3 className="commands-title" style={{ fontSize: '20px', color: '#0f172a', fontWeight: '800', marginBottom: '24px', fontFamily: 'Outfit, sans-serif' }}>
          Akses Cepat BK
        </h3>
        <div className="commands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {commandCards.map(cmd => (
            <div 
              key={cmd.id} 
              className="command-card-premium"
              onClick={() => navigate(cmd.path)}
              style={{ 
                cursor: 'pointer', 
                background: '#fff',
                border: '1px solid #e2e8f0', 
                borderLeft: `5px solid ${cmd.borderLeft}`,
                borderRadius: '16px', 
                padding: '24px', 
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
              }}
            >
              <div className="command-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="command-icon" style={{ background: cmd.iconBg, padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: cmd.iconColor, fontSize: '24px' }}>{cmd.icon}</span>
                </div>
                <span className="command-arrow material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: '20px' }}>arrow_forward</span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>{cmd.title}</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{cmd.description}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default BkMainDashboard;
