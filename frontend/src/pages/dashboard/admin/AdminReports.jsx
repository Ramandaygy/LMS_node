import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminReports = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_courses: 0,
    total_parents: 0,
    active_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('students');
  const [dateRange, setDateRange] = useState('month');
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
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

  const fetchRecentActivities = async () => {
    // Simulasi data aktivitas terbaru
    setRecentActivities([
      { id: 1, time: '10 menit lalu', user: 'Admin', action: 'Menambah siswa baru', detail: 'Ahmad Fauzi (NIS: 2024001)', icon: 'person_add' },
      { id: 2, time: '1 jam lalu', user: 'Guru', action: 'Membuat tugas baru', detail: 'Latihan Pythagoras - Kelas 8A', icon: 'assignment' },
      { id: 3, time: '2 jam lalu', user: 'Siswa', action: 'Mengumpulkan tugas', detail: 'PR Pecahan - Siti Nurhaliza', icon: 'task_alt' },
      { id: 4, time: '3 jam lalu', user: 'Admin', action: 'Mengupdate pengaturan', detail: 'Perubahan jadwal semester', icon: 'settings' },
    ]);
  };

  const handleExport = (format) => {
    alert(`Fitur export laporan dalam format ${format} akan segera tersedia`);
  };

  if (loading) return <div className="reports-loading">Memuat dashboard...</div>;

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="reports-header">
        <div>
          <span className="reports-badge">Analytics & Insights</span>
          <h2 className="reports-title">Laporan Statistik</h2>
          <p className="reports-subtitle">Pantau performa dan aktivitas sekolah secara real-time</p>
        </div>
        <div className="reports-actions">
          <button className="reports-export-btn" onClick={() => handleExport('PDF')}>
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Export PDF
          </button>
          <button className="reports-export-btn secondary" onClick={() => handleExport('Excel')}>
            <span className="material-symbols-outlined">table_chart</span>
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>Tipe Laporan</label>
          <div className="filter-select">
            <span className="material-symbols-outlined">analytics</span>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="students">Laporan Siswa</option>
              <option value="teachers">Laporan Guru</option>
              <option value="courses">Laporan Kursus</option>
              <option value="activity">Laporan Aktivitas</option>
            </select>
          </div>
        </div>
        <div className="filter-group">
          <label>Periode</label>
          <div className="filter-select">
            <span className="material-symbols-outlined">calendar_today</span>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
            </select>
          </div>
        </div>
        <button className="reports-apply-btn">
          <span className="material-symbols-outlined">refresh</span>
          Terapkan Filter
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="reports-stats-grid">
        <div className="stats-card">
          <div className="stats-card-icon">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="stats-card-info">
            <h3>Total Siswa</h3>
            <p className="stats-number">{stats.total_students}</p>
            <span className="stats-trend positive">
              <span className="material-symbols-outlined">trending_up</span>
              +12 dari bulan lalu
            </span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon teacher">
            <span className="material-symbols-outlined">person_pin</span>
          </div>
          <div className="stats-card-info">
            <h3>Total Guru</h3>
            <p className="stats-number">{stats.total_teachers}</p>
            <span className="stats-trend positive">
              <span className="material-symbols-outlined">trending_up</span>
              +2 dari bulan lalu
            </span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon course">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <div className="stats-card-info">
            <h3>Total Kursus</h3>
            <p className="stats-number">{stats.total_subjects || 0}</p>
            <span className="stats-trend positive">
              <span className="material-symbols-outlined">trending_up</span>
              +5 dari bulan lalu
            </span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon parent">
            <span className="material-symbols-outlined">family_restroom</span>
          </div>
          <div className="stats-card-info">
            <h3>Orang Tua Terdaftar</h3>
            <p className="stats-number">{stats.total_parents}</p>
            <span className="stats-trend positive">
              <span className="material-symbols-outlined">trending_up</span>
              +8 dari bulan lalu
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="reports-chart">
        <div className="chart-header">
          <h3>Statistik Aktivitas Harian</h3>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color primary"></div>
              <span>Aktivitas Pengguna</span>
            </div>
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-bars">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
              const heights = [120, 95, 145, 110, 135, 80, 60];
              return (
                <div key={idx} className="chart-bar-item">
                  <div className="chart-bar" style={{ height: `${heights[idx]}px` }}>
                    <span className="chart-value">{heights[idx]}</span>
                  </div>
                  <span className="chart-label">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="chart-note">*Grafik aktivitas pengguna aktif per hari</p>
      </div>

      {/* Recent Activity Table */}
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Aktivitas Terbaru</h3>
          <button className="view-all-btn">
            Lihat Semua
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="activity-table-container">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aktivitas</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <div className="activity-time">
                      <span className="material-symbols-outlined">schedule</span>
                      {activity.time}
                    </div>
                  </td>
                  <td>
                    <div className="activity-user">
                      <div className="user-avatar">
                        <span className="material-symbols-outlined">account_circle</span>
                      </div>
                      {activity.user}
                    </div>
                  </td>
                  <td>
                    <div className="activity-action">
                      <span className="material-symbols-outlined">{activity.icon}</span>
                      {activity.action}
                    </div>
                  </td>
                  <td className="activity-detail">{activity.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Section */}
      <div className="reports-export-section">
        <div className="export-content">
          <span className="material-symbols-outlined">download</span>
          <div>
            <h4>Unduh Laporan Lengkap</h4>
            <p>Dapatkan data lengkap dalam format PDF atau Excel untuk keperluan arsip</p>
          </div>
        </div>
        <div className="export-buttons">
          <button className="export-btn pdf" onClick={() => handleExport('PDF')}>
            <span className="material-symbols-outlined">picture_as_pdf</span>
            PDF
          </button>
          <button className="export-btn excel" onClick={() => handleExport('Excel')}>
            <span className="material-symbols-outlined">table_chart</span>
            Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;