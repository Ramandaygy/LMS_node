import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from 'recharts';
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
    { id: 1, title: 'Data Master', description: 'Kelola data siswa, guru, kelas, dan mata pelajaran.', icon: 'database', path: '/dashboard/admin/data-master', borderLeft: '#3b82f6', iconBg: '#eff6ff', iconColor: '#2563eb' },
    { id: 5, title: 'Pusat Monitoring', description: 'Pantau siswa (EWS Risk), pemetaan guru-siswa, dan aktivitas mengajar.', icon: 'monitoring', path: '/dashboard/admin/monitoring', borderLeft: '#ec4899', iconBg: '#fce7f3', iconColor: '#db2777' },
    { id: 2, title: 'Tahun Ajaran', description: 'Atur semester, kalender akademik, dan kenaikan kelas.', icon: 'calendar_month', path: '/dashboard/admin/academic-year', borderLeft: '#10b981', iconBg: '#ecfdf5', iconColor: '#059669' },
    { id: 3, title: 'Penugasan Guru', description: 'Atur jadwal pelajaran dan pembagian tugas mengajar guru.', icon: 'assignment_ind', path: '/dashboard/admin/schedule', borderLeft: '#f59e0b', iconBg: '#fffbeb', iconColor: '#d97706' },
    { id: 4, title: 'Laporan', description: 'Lihat statistik, aktivitas, dan unduh laporan performa sekolah.', icon: 'analytics', path: '/dashboard/admin/reports', borderLeft: '#8b5cf6', iconBg: '#f5f3ff', iconColor: '#7c3aed' }
  ];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  // Data for Bar Chart
  const barData = [
    { name: 'Siswa', value: stats.total_students, color: '#2563eb' },
    { name: 'Guru', value: stats.total_teachers, color: '#059669' },
    { name: 'Ortu/Wali', value: stats.total_parents, color: '#d97706' },
  ];

  // Mock data for Line Chart (Trend aktivitas bulanan)
  const lineData = [
    { name: 'Jan', kunjungan: 4000 },
    { name: 'Feb', kunjungan: 3000 },
    { name: 'Mar', kunjungan: 5000 },
    { name: 'Apr', kunjungan: 4500 },
    { name: 'Mei', kunjungan: 6000 },
    { name: 'Jun', kunjungan: 5500 },
    { name: 'Jul', kunjungan: 7000 },
  ];

  return (
    <div className="admin-dashboard-modern" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <section className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="header-badge" style={{ alignSelf: 'flex-start', background: '#e0e7ff', color: '#4f46e5', padding: '6px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          DASHBOARD ADMINISTRATOR
        </span>
        <h2 className="header-title" style={{ fontSize: '32px', color: '#0f172a', fontWeight: '800', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Sistem Manajemen Pembelajaran (LMS)
        </h2>
        <p className="header-subtitle" style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
          Ringkasan real-time aktivitas pembelajaran dan administrasi LMS.
        </p>
      </section>

      {/* Bento Grid Metrics */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Siswa Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'transform 0.2s ease-in-out' }}>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#2563eb' }}>school</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_students}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Siswa Aktif</p>
        </div>

        {/* Guru Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'transform 0.2s ease-in-out' }}>
          <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669' }}>supervisor_account</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_teachers}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Guru Aktif</p>
        </div>

        {/* Wali Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'transform 0.2s ease-in-out' }}>
          <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#d97706' }}>family_restroom</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_parents}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orang Tua/Wali</p>
        </div>

        {/* Kelas Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'transform 0.2s ease-in-out' }}>
          <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#4f46e5' }}>class</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_classes}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Kelas</p>
        </div>

        {/* Mapel Card */}
        <div className="metric-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'transform 0.2s ease-in-out' }}>
          <div style={{ background: '#fff1f2', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#e11d48' }}>library_books</span>
          </div>
          <h4 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#0f172a' }}>{stats.total_subjects}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mata Pelajaran</p>
        </div>

      </div>

      {/* Charts Section */}
      <div className="charts-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Bar Chart: Populasi */}
        <div className="chart-card" style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800', marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>
            Proporsi Pengguna
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart: Tren Aktivitas */}
        <div className="chart-card" style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800', marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>
            Tren Aktivitas (Simulasi)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="kunjungan" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Control Center */}
      <div className="commands-section" style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
        <h3 className="commands-title" style={{ fontSize: '20px', color: '#0f172a', fontWeight: '800', marginBottom: '24px', fontFamily: 'Outfit, sans-serif' }}>
          Pusat Kendali Admin
        </h3>
        <div className="commands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {(() => {
            const userRole = (() => {
              try {
                const u = localStorage.getItem('user');
                return u ? JSON.parse(u)?.role : null;
              } catch (e) {
                return null;
              }
            })();

            const filteredCards = commandCards.filter(cmd => {
              if (userRole === 'wakil_kurikulum') {
                return cmd.title !== 'Data Master';
              }
              return true;
            });

            return filteredCards.map(cmd => (
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
                <h4 className="command-title" style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: '#1e293b' }}>{cmd.title}</h4>
                <p className="command-description" style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.5, fontWeight: '500' }}>{cmd.description}</p>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;