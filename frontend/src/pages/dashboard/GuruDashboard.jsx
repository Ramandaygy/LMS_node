import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/dashboard/guru/guru.css';

const GuruDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0,
    total_courses: 0,
    pending_assignments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeClasses, setActiveClasses] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      // Get teacher classes
      const profileRes = await api.get('/profile');
      if (profileRes.data && profileRes.data.classes) {
        const mappedClasses = profileRes.data.classes.map(c => ({
          id: c._id,
          name: c.name,
          room: 'LMS Online', // Ruang virtual default
          students: 0, // Akan diperbarui jika ada endpoint detail
          progress: Math.floor(Math.random() * 40) + 40, // Simulated progress for now as there's no class progress endpoint
          time: 'Sesuai Jadwal',
          thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6agdB1chHQ1hIabOPEJbhPbArKf5qeo3ffmnxx8GRQ5bFM1MxdSQzlWYUQ_JIKKyAR1_L5bYzMk_Y6w392oEYhU-fV-JdfCjbaXjVIB3yvxz6RcOEqJYj9YFQ7XO0q9xPVhoHAqP9qXcel4WSy6AdHUoXQaXJwu0gKRDRoQl9eXTscMVtk-XuA3twoIhMfjLPOBe32g1nxXJPP6yK1h4riv5Ql5VgbZc1kdeboZWxOzo20v5dLleslFQib_gltuubthhD3aDnFxk'
        }));
        setActiveClasses(mappedClasses);
      }

      // Get pending tasks (assignments)
      const assignmentsRes = await api.get('/assignments/teacher/me');
      if (assignmentsRes.data && assignmentsRes.data.data) {
        const allAssignments = assignmentsRes.data.data;
        // Ambil 3 tugas terbaru sebagai pending tasks
        const recentTasks = allAssignments.slice(0, 3).map(task => ({
          id: task._id,
          title: task.title,
          class: task.class_name || 'Semua',
          submitted: task.submissions ? task.submissions.length : 0,
          total: 30, // Estimasi total siswa
          icon: 'assignment'
        }));
        setPendingTasks(recentTasks);
        setStats(prev => ({ ...prev, pending_assignments: allAssignments.length }));
      }
    } catch (err) {
      console.error('Failed to fetch teacher data', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="guru-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="guru-error">{error}</div>;
  }

  return (
    <div className="guru-dashboard-modern">
      {/* Bento Layout Header */}
      <div className="dashboard-header-grid">
        {/* Current Session Card */}
        <div className="current-session-card">
          <div className="session-badge">
            <span className="live-dot"></span>
            Sesi Berlangsung
          </div>
          <div className="session-info">
            <h2>{activeClasses.length > 0 ? activeClasses[0].name : 'Selamat Datang'}</h2>
            <p>Pusat Aktivitas Kelas Anda</p>
          </div>
          <div className="session-meta">
            <div className="meta-item">
              <span className="material-symbols-outlined">schedule</span>
              <span>{activeClasses.length > 0 ? activeClasses[0].time : 'Tidak ada jadwal terdekat'}</span>
            </div>
            <div className="meta-item">
              <span className="material-symbols-outlined">group</span>
              <span>32 Siswa Hadir</span>
            </div>
          </div>
          <div className="session-actions">
            <button className="btn-attendance">
              <span className="material-symbols-outlined">how_to_reg</span>
              Absensi Siswa
            </button>
            <button className="btn-materials">
              <span className="material-symbols-outlined">description</span>
              Materi &amp; Media
            </button>
          </div>
          <div className="timer-card">
            <p>Durasi Tersisa</p>
            <p className="timer-value">42:15</p>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="pending-tasks-card">
          <div className="tasks-header">
            <h3>Perlu Dinilai</h3>
            <span className="tasks-badge">{stats.pending_assignments || 12} TUGAS</span>
          </div>
          <div className="tasks-list">
            {pendingTasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-icon">
                  <span className="material-symbols-outlined">{task.icon}</span>
                </div>
                <div className="task-info">
                  <h4>{task.title}</h4>
                  <p>{task.class} • {task.submitted} Dikumpulkan</p>
                </div>
                <button className="task-arrow">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            ))}
          </div>
          <button className="view-all-btn" onClick={() => navigate('/dashboard/guru/assignments')}>
            Lihat Semua
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card-item">
          <div className="stat-icon-bg">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="stat-info">
            <h4>{stats.total_students}</h4>
            <p>Siswa Binaan</p>
          </div>
          <span className="stat-trend positive">+12% this term</span>
        </div>
        <div className="stat-card-item">
          <div className="stat-icon-bg">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <div className="stat-info">
            <h4>{stats.total_courses}</h4>
            <p>Kursus Dibuat</p>
          </div>
          <span className="stat-trend positive">+5% this term</span>
        </div>
        <div className="stat-card-item">
          <div className="stat-icon-bg">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <div className="stat-info">
            <h4>{stats.pending_assignments || 12}</h4>
            <p>Tugas Menunggu</p>
          </div>
          <span className="stat-trend warning">3 Overdue</span>
        </div>
        <div className="stat-card-item system-status">
          <div className="system-status-content">
            <div className="status-icon">
              <span className="material-symbols-outlined">cloud_done</span>
            </div>
            <div>
              <p className="status-label">System Status</p>
              <h5 className="status-title">LMS Core: Optimal</h5>
            </div>
          </div>
          <div className="status-avatars">
            <div className="avatar-more">+4</div>
          </div>
        </div>
      </div>

      {/* Active Classes Section */}
      <div className="active-classes-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Kelas Aktif</h3>
            <p className="section-subtitle">Kelola materi dan kemajuan siswa di setiap kelas.</p>
          </div>
          <div className="view-controls">
            <button className="view-btn active">
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button className="view-btn">
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </button>
          </div>
        </div>

        <div className="classes-grid">
          {activeClasses.map(classItem => (
            <div key={classItem.id} className="class-card">
              <div className="class-thumbnail">
                <img src={classItem.thumbnail} alt={classItem.name} />
                <div className="thumbnail-overlay"></div>
                <span className="semester-badge">GANJIL 2024</span>
              </div>
              <div className="class-content">
                <div>
                  <h4 className="class-name">{classItem.name}</h4>
                  <p className="class-meta">{classItem.students} Siswa • {classItem.room}</p>
                </div>
                <div className="progress-section">
                  <div className="progress-header">
                    <span>Kurikulum</span>
                    <span>{classItem.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${classItem.progress}%` }}></div>
                  </div>
                </div>
                <div className="class-footer">
                  <div className="student-avatars">
                    <div className="avatar-more">+{classItem.students - 3}</div>
                  </div>
                  <button className="manage-btn" onClick={() => navigate(`/dashboard/guru/courses/${classItem.id}`)}>
                    Kelola
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-bottom-grid">
        {/* Messages Center */}
        <div className="messages-card">
          <div className="card-header">
            <h3>Pesan Terakhir</h3>
            <button className="link-btn">Buka Chat</button>
          </div>
          <div className="messages-list">
            <div className="message-item">
              <div className="message-avatar">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQqEqhefhOWnv508KXS7etYZG24bJ1J9JZI4l6JU5jzmcWmFGYfuFtZ57Pn8leL0f69W0wCYgyzjGYZ9K3HP4DQ5DkiUMivwSHh_KJm-5xHenx5bAeSOGykfDbzjRvKuBfmlwsxg9NKOiTU_R6A6VdGjY9X-VnXpFct36w5Eq3E9VO0DIr2HhcWLtDWcih8xb49Zl7dpgbD37T7NVIlhogT0_3Gys_4eSrP3nvy3B1K8mDAIjeJWktD-P7y300URylNOWFdxfLzVc" alt="Student" />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <h4>Rina Wijaya (8A)</h4>
                  <span>12:30 PM</span>
                </div>
                <p>Pak, izin bertanya untuk soal nomor 5 di tugas Aljabar kemarin...</p>
              </div>
            </div>
            <div className="message-item">
              <div className="message-avatar">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgUCS6nhoC_Pqv4OZmGu0UV3ToIGxn13Z1jS5Hdm8nJrKowJ8_0DXn97erq9VIc4NQwE_OfvKd_7VIKAf087ZwClEizP_vZvU4VuGFpla1qWD2DjhMri5aaSA9WUd9wR9b0F0aZIjPN0EBgp6P5uLrOmnycNj31F_4dZhOdfoheGCgkCvtJQglM9GhuB2Dh33BUFR9F2SjK7xtoe5XbMHyRO_Wje-boqVota4auaC3tKOulkfVJr3gp-7Z4x-O3aIgr62DGan4JvI" alt="Parent" />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <h4>Orang Tua Andi (8B)</h4>
                  <span>Yesterday</span>
                </div>
                <p>Selamat sore Pak, apakah besok ada remedial matematika?</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Center */}
        <div className="info-card">
          <div className="card-header">
            <h3>Pusat Informasi Sekolah</h3>
          </div>
          <div className="info-list">
            <div className="info-item primary">
              <h4>Rapat Kurikulum Semester Genap</h4>
              <p>Jumat, 15 Okt 2024 • 14:00 @ Ruang Guru Utama</p>
            </div>
            <div className="info-item secondary">
              <h4>Pengisian Nilai Tengah Semester</h4>
              <p>Batas akhir: 20 Okt 2024, 23:59 WIB</p>
            </div>
            <div className="info-item tertiary">
              <h4>Pemeliharaan Server LMS</h4>
              <p>Minggu, 10 Okt 2024 • 01:00 - 05:00 WIB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuruDashboard;