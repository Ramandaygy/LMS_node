import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/dashboard/siswa/siswa.css';

const SiswaDashboard = () => {
  const [stats, setStats] = useState({
    enrolled_courses: 0,
    overall_progress: 0,
    upcoming_deadlines: 0,
    completed_assignments: 0
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    setUser(currentUser);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching siswa stats...');
      const response = await api.get('/dashboard/stats');
      console.log('📊 Stats response:', response.data);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setError('Gagal memuat data dashboard. Silakan coba lagi.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchStats} className="btn-retry">Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="siswa-dashboard-content">
      {/* Welcome Card */}
      <div className="welcome-card">
        <h2>Selamat datang, {user?.full_name?.split(' ')[0] || 'Siswa'}! 👋</h2>
        <p>Terus semangat belajar! Kamu sudah menyelesaikan {stats.overall_progress}% dari total kursus.</p>
      </div>

      {/* Quick Actions - Arahkan ke halaman masing-masing */}
      <div className="quick-actions">
        <div className="quick-action-btn" onClick={() => window.location.href = '/dashboard/siswa/courses'}>
          <span className="btn-icon">📚</span>
          <span>Cari Kursus Baru</span>
        </div>
        <div className="quick-action-btn" onClick={() => window.location.href = '/dashboard/siswa/assignments'}>
          <span className="btn-icon">📝</span>
          <span>Kerjakan Tugas</span>
        </div>
        <div className="quick-action-btn" onClick={() => window.location.href = '/dashboard/siswa/progress'}>
          <span className="btn-icon">📊</span>
          <span>Lihat Progress</span>
        </div>
        <div className="quick-action-btn" onClick={() => window.location.href = '/dashboard/siswa/certificates'}>
          <span className="btn-icon">🎓</span>
          <span>Sertifikat Saya</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>Kursus Diikuti</h3>
            <div className="number">{stats.enrolled_courses}</div>
            <div>Kursus aktif</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <h3>Progress Belajar</h3>
            <div className="number">{stats.overall_progress}%</div>
            <div style={{ color: stats.overall_progress >= 70 ? '#28a745' : '#ffc107' }}>
              {stats.overall_progress >= 70 ? '✅ Bagus!' : '⚡ Terus semangat!'}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>Tugas Deadline</h3>
            <div className="number">{stats.upcoming_deadlines}</div>
            <div style={{ color: '#dc3545' }}>⚠️ Segera kumpulkan</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Tugas Selesai</h3>
            <div className="number">{stats.completed_assignments || 0}</div>
            <div>Dari total tugas</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout - Data Statis Sementara */}
      <div className="two-column">
        <div>
          <div className="section-header">
            <span className="section-title">📚 Kursus Saya</span>
            <button className="view-all-btn" onClick={() => window.location.href = '/dashboard/siswa/courses'}>
              Lihat Semua →
            </button>
          </div>
          <div className="course-grid">
            <div className="course-card">
              <div className="course-icon">📖</div>
              <div className="course-info">
                <h4 className="course-title">Matematika Dasar</h4>
                <p className="course-teacher">Budi Santoso, M.Pd</p>
                <div className="course-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                  </div>
                  <span className="progress-text">75%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="section-header">
            <span className="section-title">📝 Tugas Mendatang</span>
          </div>
          <div className="task-list">
            <div className="task-item">
              <div className="task-priority priority-high"></div>
              <div className="task-info">
                <div className="task-title">Latihan Pythagoras</div>
                <div className="task-meta">
                  <span>Matematika</span>
                  <span className="task-deadline">⏰ Deadline: 2 hari lagi</span>
                </div>
              </div>
              <button className="task-btn">Kerjakan</button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Section */}
      <div className="achievement-section">
        <div className="section-header">
          <span className="section-title">🏆 Pencapaian</span>
        </div>
        <div className="achievement-grid">
          <div className="achievement-card">
            <div className="achievement-icon">🎯</div>
            <div className="achievement-info">
              <h4>Progress {stats.overall_progress}%</h4>
              <p>{stats.overall_progress >= 50 ? 'Sudah mencapai setengah perjalanan' : 'Terus semangat!'}</p>
            </div>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">📚</div>
            <div className="achievement-info">
              <h4>{stats.enrolled_courses} Kursus</h4>
              <p>Kursus yang diikuti</p>
            </div>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">✅</div>
            <div className="achievement-info">
              <h4>{stats.completed_assignments || 0} Tugas Selesai</h4>
              <p>Terus tingkatkan!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiswaDashboard;