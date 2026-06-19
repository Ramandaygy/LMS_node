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
    total_courses: 0,
    active_today: 0,
    avg_attendance: 0,
    classes_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats({
        ...response.data,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    // Currently no dynamic alerts API, show default healthy system state
    setAlerts([
      { id: 1, title: 'Sistem Berjalan Normal', message: 'Tidak ada peringatan atau masalah sistem hari ini.', type: 'info', icon: 'check_circle' }
    ]);
  };

  const commandCards = [
    { id: 1, title: 'Data Master', description: 'Kelola data siswa, guru, kelas, dan mata pelajaran.', icon: 'database', path: '/dashboard/admin/data-master' },
    { id: 2, title: 'Tahun Ajaran', description: 'Atur semester, kalender akademik, dan kenaikan kelas.', icon: 'calendar_month', path: '/dashboard/admin/academic-year' },
    { id: 3, title: 'Penugasan Guru', description: 'Atur jadwal pelajaran dan pembagian tugas mengajar guru.', icon: 'assignment_ind', path: '/dashboard/admin/schedule' },
    { id: 4, title: 'Laporan', description: 'Lihat statistik, aktivitas, dan unduh laporan performa sekolah.', icon: 'analytics', path: '/dashboard/admin/reports' }
  ];

  const getAlertIconColor = (type) => {
    switch(type) {
      case 'critical': return 'tertiary';
      case 'warning': return 'secondary';
      default: return 'primary';
    }
  };

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
      <section className="dashboard-header">
        <div className="header-left">
          <span className="header-badge">Dashboard Administrator</span>
          <h2 className="header-title">Sistem Informasi Akademik</h2>
          <p className="header-subtitle">Ringkasan real-time aktivitas akademik dan administrasi sekolah.</p>
        </div>
        <button className="broadcast-btn">
          <span className="material-symbols-outlined">campaign</span>
          Buat Pengumuman
        </button>
      </section>

      {/* Bento Grid Metrics */}
      <div className="metrics-grid">
        {/* Large Metric Card */}
        <div className="metric-large">
          <div className="metric-large-header">
            <div className="metric-icon primary">
              <span className="material-symbols-outlined">school</span>
            </div>
            <span className="metric-trend positive">+12% semester ini</span>
          </div>
          <div className="metric-large-value">
            <h4>{stats.total_students.toLocaleString()}</h4>
            <p>Total Siswa Aktif</p>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Small Metrics Cluster */}
        <div className="metrics-small-cluster">
          <div className="metric-small">
            <span className="material-symbols-outlined secondary">supervisor_account</span>
            <h4>{stats.total_teachers}</h4>
            <p>Guru Aktif</p>
          </div>
          <div className="metric-small">
            <span className="material-symbols-outlined primary">family_restroom</span>
            <h4>{stats.total_parents}</h4>
            <p>Orang Tua Terdaftar</p>
          </div>
          <div className="metric-small">
            <span className="material-symbols-outlined primary">library_books</span>
            <h4>{stats.total_subjects}</h4>
            <p>Mata Pelajaran</p>
          </div>
          
          {/* System Status Card */}
          <div className="system-status">
            <div className="system-status-content">
              <div className="system-status-icon">
                <span className="material-symbols-outlined">cloud_done</span>
              </div>
              <div>
                <p className="system-status-label">Status Sistem</p>
                <h5 className="system-status-title">LMS Core: Stabil & Optimal</h5>
              </div>
            </div>
            <div className="system-status-avatars">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFedeA-zBVz3ItErROA-3QS-pfqtFHs8LOLKEywyCjNovpYGpfPnk3YgfXzByvm1AhGIMMVQBQlQR4dZ3REBnf5Kn0cZI_kPaj-rnT_YA6HJXNSqPwz8tpHIpLpIvWVdVxl6pqfrHcwR_uDSdPYmCtpMRCzTZSx14F1f6iqarPxXqPqH0TJGJ-jKRmeJjxp9LEo9h9BwNddxMm0yDZ6fK_R7v1AuaWXGF-PFXN2rFXm1_Jcq5M-yGkg8JsSaYfZrd22GKbfJUDsWM" alt="Server" className="avatar" />
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH7K_zRhoR3JMoJ-D5R4Po4LnUll7aGVAvkcpwnbL8sZNBtNwTRmwRAgIAgciRPIlnedqiScmzYdjaAPEjwBmRad4hcz82tUTQ3Seet3TKFeUNIm7PsJe07xz-q7JTpqieDOTr7KOVQTVeftLsv4UxWWfhsVLon08lPwuoyztJbKoM0uvL0zypt0xbA-OGzqGvhu7J_6QtqNOHMecGpUsWYKPlim2L3Yc2aB-vlhoIV6TacO797x5obPjR5zpS8ya9mTFBJMW4uPQ" alt="Database" className="avatar" />
              <div className="avatar-more">+4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Command Center Layout */}
      <div className="command-center">
        {/* Left: System Alerts */}
        <div className="alerts-section">
          <div className="alerts-card">
            <div className="alerts-header">
              <h3>Peringatan Sistem</h3>
              <span className="alerts-badge">3 Perhatian</span>
            </div>
            <div className="alerts-list">
              {alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className={`alert-icon ${getAlertIconColor(alert.type)}`}>
                    <span className="material-symbols-outlined">{alert.icon}</span>
                  </div>
                  <div className="alert-content">
                    <p className="alert-title">{alert.title}</p>
                    <p className="alert-message">{alert.message}</p>
                    <button className="alert-action">Kelola →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Command Center */}
        <div className="commands-section">
          <div className="commands-card">
            <h3 className="commands-title">Pusat Kendali Admin</h3>
            <div className="commands-grid">
              {commandCards.map(cmd => (
                <div 
                  key={cmd.id} 
                  className="command-card"
                  onClick={() => navigate(cmd.path)}
                >
                  <div className="command-card-header">
                    <div className="command-icon">
                      <span className="material-symbols-outlined">{cmd.icon}</span>
                    </div>
                    <span className="command-arrow material-symbols-outlined">arrow_forward</span>
                  </div>
                  <h4 className="command-title">{cmd.title}</h4>
                  <p className="command-description">{cmd.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Editorial Quote Section */}
          <div className="quote-section">
            <div className="quote-content">
              <span className="quote-icon material-symbols-outlined">format_quote</span>
              <div>
                <p className="quote-text">"Pendidikan adalah senjata paling ampuh yang dapat kamu gunakan untuk mengubah dunia."</p>
                <p className="quote-author">— Nelson Mandela</p>
              </div>
            </div>
            <div className="quote-bg-blur"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;