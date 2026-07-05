import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // dari dashboard naik ke pages, lalu ke src, lalu services
import '../../styles/dashboard/siswa/siswa.css';// CSS baru

const SiswaDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ enrolled_courses: 0, overall_progress: 0, upcoming_deadlines: 0, completed_assignments: 0 });
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
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
        setAssignments(assignData.filter(a => new Date(a.deadline) >= new Date() && !a.submitted).map(a => ({
          title: a.title,
          subject: a.subject_name || 'Umum',
          deadline: new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          urgent: new Date(a.deadline) < new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000)
        })));

        const gradedAssignments = assignData.filter(a => a.score !== null).sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 3);
        setGrades(gradedAssignments.map(g => ({
          subject: g.subject_name || 'Umum',
          assignment: g.title,
          score: g.score,
          label: g.score >= 85 ? 'TINGGI' : g.score >= 70 ? 'RATA-RATA' : 'RENDAH'
        })));
      } catch (err) {
        console.error('Error fetching assignments', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Memuat dashboard...</div>;

  return (
    <div className="siswa-dashboard">
      <main className="dashboard-main">
        {/* Welcome Header */}
        <div className="welcome-header" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>
            Halo, {user?.full_name || 'Siswa'}!
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Selamat datang di LMS SMP Negeri 1 Suradadi.</p>
        </div>
        {/* Hero bento grid */}
        <div className="hero-grid">
          <div className="hero-card featured">
            <div className="badge">Info Terkini</div>
            <h2>Selamat Datang di LMS, {user?.full_name || 'Siswa'}!</h2>
            <p>Periksa jadwal pelajaran dan tugas hari ini untuk mulai belajar.</p>
            {schedules.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <p><strong>Pelajaran selanjutnya:</strong> {schedules[0].name} ({schedules[0].time})</p>
              </div>
            )}
            <div className="bg-deco"></div>
          </div>
          <div className="hero-card points">
            <span className="material-symbols-outlined">done_all</span>
            <div className="points-value">{stats.completed_assignments || 0}</div>
            <div className="points-label">Tugas Selesai</div>
            <div className="points-today">{assignments.length} Tugas Pending</div>
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
            <h3>Jadilah yang Terbaik!</h3>
            <p>Kerjakan semua tugas tepat waktu dan perhatikan penjelasan guru dengan baik.</p>
            <button className="btn-challenge" onClick={() => window.location.href='/dashboard/siswa/assignments'}>Lihat Semua Tugas</button>
          </div>
          <div className="challenge-deco"></div>
        </div>
      </main>
    </div>
  );
};

export default SiswaDashboard;