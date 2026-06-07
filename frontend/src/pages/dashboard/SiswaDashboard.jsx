import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-dashboard.css'; // CSS khusus dashboard

const SiswaDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ materi: 0, poin: 0, poinHariIni: 0 });
  const [assignments, setAssignments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [grades, setGrades] = useState([]);
  const [currentLesson, setCurrentLesson] = useState({
    name: 'Matematika: Bangun Ruang Sisi Datar',
    room: 'Ruang Lab-A',
    teacher: 'Bpk. Suwardi',
    progress: 78
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Ambil profil user
      const profileRes = await api.get('/profile');
      const userData = profileRes.data;
      setUser(userData);

      // Ambil progress / poin (asumsikan ada /siswa/progress)
      try {
        const progressRes = await api.get('/siswa/progress');
        setProgress(progressRes.data);
      } catch {
        setProgress({ materi: 78, poin: 1240, poinHariIni: 15 });
      }

      // Ambil tugas mendatang
      try {
        const tasksRes = await api.get('/assignments/siswa/me');
        const upcoming = (tasksRes.data.data || []).filter(t => !t.submitted).slice(0, 2);
        setAssignments(upcoming);
      } catch {
        setAssignments([]);
      }

      // Ambil jadwal hari ini
      try {
        const scheduleRes = await api.get('/schedules?today=true');
        setSchedules(scheduleRes.data.data || []);
      } catch {
        setSchedules([
          { time: '08:00', name: 'Bahasa Inggris', room: 'Modul Reading', isCurrent: true },
          { time: '10:30', name: 'Istirahat', room: '', isCurrent: false },
          { time: '13:15', name: 'Pendidikan Jasmani', room: 'Praktek Basket', isCurrent: false }
        ]);
      }

      // Ambil nilai terbaru
      try {
        const gradesRes = await api.get('/siswa/grades?limit=2');
        setGrades(gradesRes.data.data || []);
      } catch {
        setGrades([
          { subject: 'Sejarah Indonesia', assignment: 'Kuis Orde Baru', score: 92, label: 'TINGGI' },
          { subject: 'Basa Jawa', assignment: 'Aksara Murda', score: 85, label: 'RATA-RATA' }
        ]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="siswa-dashboard-modern">
      {/* Bagian Hero: Welcome + Progress */}
      <div className="hero-grid">
        <div className="welcome-card">
          <div className="welcome-badge">Pelajaran Sekarang</div>
          <h2>{currentLesson.name}</h2>
          <p className="class-info">{currentLesson.room} • Guru: {currentLesson.teacher}</p>
          <div className="progress-wrapper">
            <div className="progress-label">
              <span>Progress Materi</span>
              <span className="progress-percent">{currentLesson.progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${currentLesson.progress}%` }}></div>
            </div>
          </div>
        </div>
        <div className="points-card">
          <div className="points-icon">⭐</div>
          <div className="points-info">
            <span className="points-label">Poin Akademik</span>
            <span className="points-value">{progress.poin}</span>
            <span className="points-today">+{progress.poinHariIni} Hari Ini</span>
          </div>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <section className="schedule-section">
        <div className="section-header">
          <h3>Jadwal Hari Ini</h3>
          <button className="link-button">Lihat Kalender</button>
        </div>
        <div className="schedule-horizontal">
          {schedules.map((item, idx) => (
            <div key={idx} className={`schedule-card ${item.isCurrent ? 'current' : ''}`}>
              <div className="schedule-time">
                <span className="hour">{item.time.split(':')[0]}:{item.time.split(':')[1]}</span>
                <span className="period">{parseInt(item.time) < 12 ? 'Pagi' : 'Siang'}</span>
              </div>
              <div className="schedule-info">
                <h4>{item.name}</h4>
                {item.room && <p>{item.room}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tugas Mendatang & Nilai Terbaru */}
      <div className="two-columns">
        <div className="assignments-column">
          <div className="section-header">
            <h3>Tugas Mendatang</h3>
            <button className="link-button">Selengkapnya</button>
          </div>
          <div className="task-list">
            {assignments.length === 0 && <p className="empty-message">Tidak ada tugas mendatang</p>}
            {assignments.map((task, idx) => (
              <div key={idx} className="task-item">
                <div className="task-icon">📘</div>
                <div className="task-details">
                  <h4>{task.title}</h4>
                  <p>{task.subject_name} • {new Date(task.deadline).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="task-urgency">{new Date(task.deadline) - new Date() < 86400000 ? 'Urgent' : 'Dalam Proses'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grades-column">
          <div className="section-header">
            <h3>Nilai Terbaru</h3>
            <button className="link-button">Rincian</button>
          </div>
          <div className="grades-list">
            {grades.map((grade, idx) => (
              <div key={idx} className="grade-item">
                <div className="grade-icon">📖</div>
                <div className="grade-details">
                  <h4>{grade.subject}</h4>
                  <p>{grade.assignment}</p>
                </div>
                <div className="grade-score">
                  <span className="score-number">{grade.score}</span>
                  <span className="score-label">{grade.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tantangan Mingguan */}
      <div className="challenge-card">
        <div className="challenge-content">
          <h3>Tantangan Mingguan: Jago Aljabar!</h3>
          <p>Selesaikan 5 latihan tambahan untuk mendapatkan badge 'Mathematician'.</p>
          <button className="challenge-button">Mulai Sekarang</button>
        </div>
        <div className="challenge-decoration">🏆</div>
      </div>
    </div>
  );
};

export default SiswaDashboard;