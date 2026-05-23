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
    fetchActiveClasses();
    fetchPendingTasks();
  }, []);

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

  const fetchActiveClasses = async () => {
    // Simulasi data kelas aktif
    setActiveClasses([
      { 
        id: 1, 
        name: 'Matematika - Kelas 8A', 
        room: 'Ruang 204', 
        students: 32, 
        progress: 85, 
        time: '08:00 - 09:30',
        present: 32,
        thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6agdB1chHQ1hIabOPEJbhPbArKf5qeo3ffmnxx8GRQ5bFM1MxdSQzlWYUQ_JIKKyAR1_L5bYzMk_Y6w392oEYhU-fV-JdfCjbaXjVIB3yvxz6RcOEqJYj9YFQ7XO0q9xPVhoHAqP9qXcel4WSy6AdHUoXQaXJwu0gKRDRoQl9eXTscMVtk-XuA3twoIhMfjLPOBe32g1nxXJPP6yK1h4riv5Ql5VgbZc1kdeboZWxOzo20v5dLleslFQib_gltuubthhD3aDnFxk'
      },
      { 
        id: 2, 
        name: 'IPA - Kelas 7C', 
        room: 'Lab Fisika', 
        students: 28, 
        progress: 60, 
        time: '10:00 - 11:30',
        present: 26,
        thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk1sg6l6ALYAaLKqklMej2pGqROtOATWtaj2FriiBhR9KWaghBxAGeMYG_cr_sEvGd7pxpVe-6M_L0yMNrLLmi-UCW9f1VDu88YSijpthwM0vCr-OA4r-BAxcd2MEy5P5xh30BywNetjPhWp7_jqv0n7IyBsdPKnx7cCA0BJvhQI-5vBp8dEv0kzW4t2KA6kbvfeFRl-J6R8w-mgyGm506zFTtPaNusnwWwMZ2VMxdmUFaD-QqGHxn3bRAAp-kalw1jjgvcLDF09E'
      },
      { 
        id: 3, 
        name: 'Matematika - Kelas 8B', 
        room: 'Ruang 205', 
        students: 30, 
        progress: 45, 
        time: '13:00 - 14:30',
        present: 28,
        thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUT4Mz5Rbib_q_ya2H8Q1XtMMLsR9rhT6xOkW88SDvPAmNfbgEWEE7Qe42Vw7-RrKC_Nnx_c3LjmQGr9x-tAHO1o6ER00ZRlwzVcyZVuc7TSMHrnJNM8i2RJFaZDkmRJxU8XZh-lgg4FDGG0f-nX9ochBYn0LQI9iRmzzCw-3xVGokZXWQeoDoUlFFnQrkorNrBNdu1hw4jurY7tQxNCcS9B1bYVfXtLH41tiHkAW4Grkd8gBELSg4jzefrEUYdUrY2T3ZYIk8p34'
      }
    ]);
  };

  const fetchPendingTasks = async () => {
    // Simulasi data tugas perlu dinilai
    setPendingTasks([
      { id: 1, title: 'Kuis Aljabar Dasar', class: '8B', submitted: 24, total: 30, icon: 'quiz' },
      { id: 2, title: 'Proyek Bangun Ruang', class: '8C', submitted: 12, total: 28, icon: 'assignment' },
      { id: 3, title: 'Laporan Observasi', class: '7A', submitted: 5, total: 32, icon: 'history_edu' }
    ]);
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
            <h2>Matematika - Kelas 8A</h2>
            <p>Topik: Teorema Pythagoras &amp; Geometri</p>
          </div>
          <div className="session-meta">
            <div className="meta-item">
              <span className="material-symbols-outlined">schedule</span>
              <span>08:00 - 09:30</span>
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