import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // dari dashboard naik ke pages, lalu ke src, lalu services
import '../../styles/dashboard/siswa/siswa.css';// CSS baru

const SiswaDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ enrolled_courses: 0, overall_progress: 0, upcoming_deadlines: 0, completed_assignments: 0 });
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await api.get('/profile');
      const userData = profileRes.data;
      setUser(userData);

      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);

      try {
        const scheduleRes = await api.get('/schedules/siswa/today');
        const schedData = scheduleRes.data.schedule || [];
        setSchedules(schedData.map(s => ({
          time: `${s.start_time} - ${s.end_time}`,
          name: s.subject_id?.name || 'Mata Pelajaran',
          room: s.room || '',
          isCurrent: false // could calculate if current time is within range
        })));
      } catch (err) {
        console.error('Error fetching today schedule', err);
      }

      try {
        const assignRes = await api.get('/assignments/siswa/me');
        const assignData = assignRes.data.data || [];
        setAssignments(assignData.map(a => ({
          title: a.title,
          subject: a.subject_id?.name || 'Umum',
          deadline: new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          urgent: new Date(a.due_date) < new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000)
        })));
      } catch (err) {
        console.error('Error fetching assignments', err);
      }

      // dummy grades
      setGrades([
        { subject: 'Sejarah Indonesia', assignment: 'Kuis Orde Baru', score: 92, label: 'TINGGI' },
        { subject: 'Basa Jawa', assignment: 'Aksara Murda', score: 85, label: 'RATA-RATA' }
      ]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  if (loading) return <div className="loading">Memuat dashboard...</div>;

  return (
    <div className="siswa-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="avatar">
            {user?.profileImage ? <img src={user.profileImage} alt="avatar" /> : <span className="material-symbols-outlined">account_circle</span>}
          </div>
          <div>
            <h1 className="school-name">SMP N 1 LMS</h1>
            <p className="user-greeting">Halo, {user?.full_name || 'Siswa'}</p>
          </div>
        </div>
        <button className="hamburger" onClick={toggleMenu}>
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Overlay menu (slide from right) */}
      <div className={`menu-overlay ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>
      <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <ul>
          <li><a href="/dashboard/siswa"><span className="material-symbols-outlined">dashboard</span> Dashboard</a></li>
          <li><a href="/dashboard/siswa/courses"><span className="material-symbols-outlined">auto_stories</span> Courses</a></li>
          <li><a href="/dashboard/siswa/schedule"><span className="material-symbols-outlined">calendar_today</span> Schedule</a></li>
          <li><a href="/dashboard/siswa/grades"><span className="material-symbols-outlined">leaderboard</span> Grades</a></li>
          <li><a href="/profile"><span className="material-symbols-outlined">person</span> Profile</a></li>
        </ul>
      </nav>

      <main className="dashboard-main">
        {/* Hero bento grid */}
        <div className="hero-grid">
          <div className="hero-card featured">
            <div className="badge">Pelajaran Sekarang</div>
            <h2>Matematika: Bangun Ruang Sisi Datar</h2>
            <p>Ruang Lab-A • Guru: Bpk. Suwardi</p>
            <div className="progress-wrapper">
              <div className="progress-label">Progress Materi <span>78%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '78%' }}></div></div>
            </div>
            <div className="bg-deco"></div>
          </div>
          <div className="hero-card points">
            <span className="material-symbols-outlined">star</span>
            <div className="points-value">{stats.enrolled_courses * 100 + stats.overall_progress * 10 || 1240}</div>
            <div className="points-label">Poin Akademik</div>
            <div className="points-today">+15 Hari Ini</div>
          </div>
        </div>

        {/* Jadwal hari ini */}
        <section className="schedule-section">
          <div className="section-header">
            <h3>Jadwal Hari Ini</h3>
            <a href="#" className="link">Lihat Kalender</a>
          </div>
          <div className="schedule-scroll">
            {schedules.map((item, idx) => (
              <div key={idx} className={`schedule-card ${item.isCurrent ? 'current' : ''}`}>
                <div className="time">{item.time}</div>
                <div className="schedule-info">
                  <h4>{item.name}</h4>
                  {item.room && <p>{item.room}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tugas dan Nilai */}
        <div className="two-columns">
          <div className="assignments-section">
            <div className="section-header">
              <h3>Tugas Mendatang</h3>
              <span className="material-symbols-outlined">more_horiz</span>
            </div>
            {assignments.map((task, idx) => (
              <div key={idx} className="task-card">
                <div className="task-icon"><span className="material-symbols-outlined">history_edu</span></div>
                <div className="task-details">
                  <h4>{task.title}</h4>
                  <p>{task.subject} • {task.deadline}</p>
                </div>
                <div className={`task-badge ${task.urgent ? 'urgent' : ''}`}>{task.urgent ? 'Urgent' : 'Dalam Proses'}</div>
              </div>
            ))}
          </div>
          <div className="grades-section">
            <div className="section-header">
              <h3>Nilai Terbaru</h3>
              <a href="#" className="link">Rincian</a>
            </div>
            <div className="grades-list">
              {grades.map((grade, idx) => (
                <div key={idx} className="grade-card">
                  <div className="grade-icon"><span className="material-symbols-outlined">book</span></div>
                  <div>
                    <h4>{grade.subject}</h4>
                    <p>{grade.assignment}</p>
                  </div>
                  <div className="grade-score">{grade.score}</div>
                  <div className="grade-label">{grade.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tantangan */}
        <div className="challenge-card">
          <div className="challenge-text">
            <h3>Tantangan Mingguan: Jago Aljabar!</h3>
            <p>Selesaikan 5 latihan tambahan untuk mendapatkan badge 'Mathematician'.</p>
            <button className="btn-challenge">Mulai Sekarang</button>
          </div>
          <div className="challenge-deco"></div>
        </div>
      </main>
    </div>
  );
};

export default SiswaDashboard;