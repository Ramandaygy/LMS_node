import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/dashboard/ortu/ortu.css';

const OrtuDashboard = () => {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    try {
      // Ambil profil orang tua
      const profileRes = await api.get('/profile');
      setUser(profileRes.data);

      // Ambil daftar anak
      const childrenRes = await api.get('/attendance/ortu/children');
      const kids = childrenRes.data.children || [];
      setChildren(kids);
      if (kids.length > 0) {
        setSelectedChild(kids[0]);
        fetchProgress(kids[0].id);
        fetchChildDetails(kids[0].id);
      }
    } catch (err) {
      console.error('Error fetching parent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (childId) => {
    try {
      const res = await api.get(`/progress/ortu/children/${childId}`);
      setProgress(res.data.data);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setProgress(null);
    }
  };

  const fetchChildDetails = async (childId) => {
    try {
      const assignRes = await api.get(`/assignments/ortu/children/${childId}`);
      setAssignments(assignRes.data.data || []);
      
      const attendRes = await api.get(`/attendance/ortu/children/${childId}/today`);
      setTodayAttendance(attendRes.data.attendance || []);
    } catch (err) {
      console.error('Error fetching child details', err);
    }
  };

  const handleChildChange = (child) => {
    setSelectedChild(child);
    fetchProgress(child.id);
    fetchChildDetails(child.id);
  };

  if (loading) return <div className="loading">Memuat dashboard...</div>;

  return (
    <div className="ortu-dashboard">


      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Pantau Perkembangan Belajar Anak Anda</h2>
          <p>Lihat progress, nilai, dan rekomendasi belajar</p>
        </div>

        {/* Pilih Anak */}
        {children.length > 0 && (
          <div className="child-selector">
            <label>Pilih Anak:</label>
            <div className="child-buttons">
              {children.map(child => (
                <button
                  key={child.id}
                  className={`child-btn ${selectedChild?.id === child.id ? 'active' : ''}`}
                  onClick={() => handleChildChange(child)}
                >
                  {child.full_name} - {child.class_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Card */}
        {selectedChild && progress && (
          <div className="progress-card">
            <h3>Progress Belajar {selectedChild.full_name}</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Rata-rata Nilai</span>
                <span className="stat-value">{progress.avgScore?.toFixed(1) || 0}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Kehadiran</span>
                <span className="stat-value">{progress.attendanceRate?.toFixed(1) || 100}%</span>
              </div>
              <div className={`stat-item risk-${progress.risk}`}>
                <span className="stat-label">Status</span>
                <span className="stat-value">{progress.message || 'Normal'}</span>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-label">Progress Akademik</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.avgScore || 0}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder jika belum ada progress */}
        {selectedChild && !progress && (
          <div className="info-card">Belum ada data progress untuk anak ini.</div>
        )}

        {/* Jadwal dan Kehadiran Hari Ini */}
        {selectedChild && (
          <div className="attendance-card card-section">
            <h3>Jadwal & Kehadiran Hari Ini</h3>
            {todayAttendance.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                {todayAttendance.map((att, idx) => (
                  <div key={idx} className="schedule-item">
                    <div>
                      <strong>{att.schedule_id?.subject_id?.name || 'Mata Pelajaran'}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {att.schedule_id?.start_time} - {att.schedule_id?.end_time} | Guru: {att.teacher_id?.full_name}
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${att.status === 'hadir' ? 'badge-success' : 'badge-warning'}`}>
                        {att.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666' }}>Belum ada data absensi untuk jadwal hari ini.</p>
            )}
          </div>
        )}

        {/* Tugas Mendatang */}
        {selectedChild && (
          <div className="assignments-card card-section">
            <h3>Tugas Mendatang</h3>
            {assignments.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                {assignments.map(a => (
                  <div key={a._id} className="task-item" style={{ borderLeft: '4px solid #0040a1', paddingLeft: '12px' }}>
                    <div>
                      <strong>{a.title}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Mata Pelajaran: {a.subject_name || '-'} | Tenggat: {new Date(a.deadline).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666' }}>Tidak ada tugas yang aktif saat ini.</p>
            )}
          </div>
        )}

        {/* Rekomendasi Sederhana */}
        <div className="suggestion-card">
          <h3>Tips untuk Orang Tua</h3>
          <ul>
            <li>✔️ Pantau jadwal belajar anak secara rutin</li>
            <li>✔️ Diskusikan tugas yang sulit dengan guru</li>
            <li>✔️ Beri motivasi dan apresiasi atas usaha anak</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default OrtuDashboard;