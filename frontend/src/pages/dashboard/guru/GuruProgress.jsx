import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-progress.css';

const GuruProgress = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const classList = res.data.data || [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClass(classList[0]._id);
      }
    } catch (err) {
      setError('Gagal memuat daftar kelas');
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsProgress();
    }
  }, [selectedClass]);

  const fetchStudentsProgress = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/progress/class/${selectedClass}`);
      const studentsData = res.data.data || [];
      setStudents(studentsData);
    } catch (err) {
      setError('Gagal memuat progress siswa: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const sortedStudents = () => {
    const sorted = [...students];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.student_name.localeCompare(b.student_name));
        break;
      case 'score':
        sorted.sort((a, b) => b.avgScore - a.avgScore);
        break;
      case 'risk':
        const riskOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        sorted.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
        break;
      case 'attendance':
        sorted.sort((a, b) => b.attendanceRate - a.attendanceRate);
        break;
      default:
        break;
    }
    return sorted;
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffb700';
      case 'low':
        return '#6bcf7f';
      default:
        return '#999';
    }
  };

  const currentClass = classes.find(c => c._id === selectedClass);

  return (
    <div className="guru-progress-container">
      <div className="page-header">
        <div className="header-title">
          <h2>Monitoring Progres Siswa</h2>
          <p>Analisis Perkembangan Siswa berbasis Machine Learning</p>
        </div>
      </div>

      <div className="feature-info-card premium-card">
        <div className="feature-icon">
           <span className="material-symbols-outlined">psychology</span>
        </div>
        <div className="feature-text">
           <h4>Random Forest AI Prediction</h4>
           <p>Sistem ini menggunakan algoritma <strong>Machine Learning (Random Forest)</strong> untuk memprediksi status risiko perkembangan belajar siswa. Prediksi ini berdasarkan data gabungan dari <strong>Nilai Tugas, Nilai Kuis, Kehadiran, dan Penyelesaian Materi</strong>.</p>
        </div>
      </div>

      <div className="filter-section premium-card">
        <div className="class-selector">
          <label htmlFor="class-select">Pilih Kelas</label>
          <div className="select-wrapper">
            <span className="material-symbols-outlined select-icon">school</span>
            <select 
              id="class-select"
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={classes.length === 0}
            >
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sort-selector">
          <label htmlFor="sort-select">Urutkan</label>
          <div className="select-wrapper">
            <span className="material-symbols-outlined select-icon">sort</span>
            <select 
              id="sort-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Nama Siswa</option>
              <option value="score">Nilai Tertinggi</option>
              <option value="risk">Status Risiko</option>
              <option value="attendance">Kehadiran</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-message error-message">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <span className="material-symbols-outlined spin">sync</span>
          <p>Memuat dan Menganalisis Data...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state premium-card">
          <span className="material-symbols-outlined">group_off</span>
          <h3>Tidak ada siswa</h3>
          <p>Belum ada data siswa untuk kelas ini.</p>
        </div>
      ) : (
        <div className="students-table-wrapper premium-card">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Tugas</th>
                <th>Kuis</th>
                <th>Kehadiran</th>
                <th>Materi</th>
                <th>Prediksi AI</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents().map((student, idx) => (
                <tr key={idx}>
                  <td className="student-info-cell">
                    <div className="student-avatar">
                      {student.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="student-name">{student.student_name}</div>
                      <div className="student-nis">NIS: {student.nis}</div>
                    </div>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span className="progress-text">{student.avgScore.toFixed(0)}%</span>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ 
                          width: `${Math.min(student.avgScore, 100)}%`,
                          backgroundColor: student.avgScore >= 75 ? '#10b981' : student.avgScore >= 60 ? '#f59e0b' : '#ef4444'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span className="progress-text">{(student.avgQuizScore || 0).toFixed(0)}%</span>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ 
                          width: `${Math.min(student.avgQuizScore || 0, 100)}%`,
                          backgroundColor: (student.avgQuizScore || 0) >= 75 ? '#10b981' : (student.avgQuizScore || 0) >= 60 ? '#f59e0b' : '#ef4444'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span className="progress-text">{student.attendanceRate.toFixed(0)}%</span>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ 
                          width: `${Math.min(student.attendanceRate, 100)}%`,
                          backgroundColor: student.attendanceRate >= 85 ? '#10b981' : student.attendanceRate >= 70 ? '#f59e0b' : '#ef4444'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span className="progress-text">{student.materialCompletionRate.toFixed(0)}%</span>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ 
                          width: `${Math.min(student.materialCompletionRate, 100)}%`,
                          backgroundColor: student.materialCompletionRate >= 75 ? '#10b981' : student.materialCompletionRate >= 50 ? '#f59e0b' : '#ef4444'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="risk-cell">
                      <span className={`risk-badge risk-${student.risk}`}>
                        <span className="material-symbols-outlined">
                          {student.risk === 'high' ? 'warning' : student.risk === 'medium' ? 'info' : 'verified'}
                        </span>
                        {student.risk === 'high' ? 'Tinggi' : student.risk === 'medium' ? 'Sedang' : 'Rendah'}
                      </span>
                      <div className="risk-message">{student.message}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 && (
        <div className="statistics-section">
          <h3 className="section-title">Ringkasan Analisis Kelas</h3>
          <div className="stats-grid">
            <div className="stat-card premium-card">
              <div className="stat-icon bg-blue">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div className="stat-info">
                <p className="stat-label">Rata-rata Kelas</p>
                <p className="stat-value">
                  {((students.reduce((sum, s) => sum + s.avgScore + (s.avgQuizScore || 0), 0)) / (students.length * 2)).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="stat-card premium-card">
              <div className="stat-icon bg-green">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div className="stat-info">
                <p className="stat-label">Risiko Rendah</p>
                <p className="stat-value text-green">
                  {students.filter(s => s.risk === 'low').length} <span className="stat-suffix">Siswa</span>
                </p>
              </div>
            </div>
            <div className="stat-card premium-card">
              <div className="stat-icon bg-yellow">
                <span className="material-symbols-outlined">info</span>
              </div>
              <div className="stat-info">
                <p className="stat-label">Risiko Sedang</p>
                <p className="stat-value text-yellow">
                  {students.filter(s => s.risk === 'medium').length} <span className="stat-suffix">Siswa</span>
                </p>
              </div>
            </div>
            <div className="stat-card premium-card">
              <div className="stat-icon bg-red">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div className="stat-info">
                <p className="stat-label">Risiko Tinggi</p>
                <p className="stat-value text-red">
                  {students.filter(s => s.risk === 'high').length} <span className="stat-suffix">Siswa</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruProgress;
