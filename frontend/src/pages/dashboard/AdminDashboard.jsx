import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/dashboard/admin/admin.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_parents: 0,
    total_classes: 0,
    total_subjects: 0
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
    { id: 1, title: 'Data Master', description: 'Kelola data siswa, guru, kelas, dan mata pelajaran.', icon: 'database', path: '/dashboard/admin/data-master' },
    { id: 2, title: 'Tahun Ajaran', description: 'Atur semester, kalender akademik, dan kenaikan kelas.', icon: 'calendar_month', path: '/dashboard/admin/academic-year' },
    { id: 3, title: 'Penugasan Guru', description: 'Atur jadwal pelajaran and pembagian tugas mengajar guru.', icon: 'assignment_ind', path: '/dashboard/admin/schedule' },
    { id: 4, title: 'Laporan', description: 'Lihat statistik, aktivitas, dan unduh laporan performa sekolah.', icon: 'analytics', path: '/dashboard/admin/reports' }
  ];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-modern">
      {/* Header Section */}
      <section className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div className="header-left">
          <span className="header-badge">Dashboard Administrator</span>
          <h2 className="header-title" style={{ fontSize: '28px', color: '#1e293b', fontWeight: 'bold' }}>Sistem Informasi Akademik</h2>
          <p className="header-subtitle">Ringkasan real-time aktivitas akademik dan administrasi sekolah.</p>
        </div>
      </section>

      {/* Bento Grid Metrics */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#3b82f6' }}>school</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_students}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Siswa Aktif</p>
        </div>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>supervisor_account</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_teachers}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Guru Aktif</p>
        </div>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#f59e0b' }}>family_restroom</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_parents}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Orang Tua/Wali</p>
        </div>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#8b5cf6' }}>class</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_classes}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Kelas</p>
        </div>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#ec4899' }}>library_books</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_subjects}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Mata Pelajaran</p>
        </div>
      </div>

      {/* Commands Center */}
      <div className="commands-section">
        <div className="commands-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 className="commands-title" style={{ fontSize: '18px', color: '#0f172a', fontWeight: 'bold', marginBottom: '20px' }}>Pusat Kendali Admin</h3>
          <div className="commands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {commandCards.map(cmd => (
              <div 
                key={cmd.id} 
                className="command-card"
                onClick={() => navigate(cmd.path)}
                style={{ cursor: 'pointer', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', transition: 'all 0.2s ease-in-out' }}
              >
                <div className="command-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div className="command-icon" style={{ background: '#eff6ff', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>{cmd.icon}</span>
                  </div>
                  <span className="command-arrow material-symbols-outlined" style={{ color: '#94a3b8' }}>arrow_forward</span>
                </div>
                <h4 className="command-title" style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1e293b' }}>{cmd.title}</h4>
                <p className="command-description" style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>{cmd.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;