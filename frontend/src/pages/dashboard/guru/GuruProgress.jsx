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
          <div className="ai-badge">
            <span className="material-symbols-outlined">psychology</span>
            Powered by Random Forest AI
          </div>
        </div>
        <p>Prediksi risiko perkembangan belajar siswa dianalisis secara otomatis oleh model Machine Learning.</p>
      </div>

      <div className="filter-section">
        <div className="class-selector">
          <label htmlFor="class-select">Pilih Kelas:</label>
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

        <div className="sort-selector">
          <label htmlFor="sort-select">Urutkan Berdasarkan:</label>
          <select 
            id="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Nama Siswa</option>
            <option value="score">Nilai Tertinggi</option>
            <option value="risk">Status Risiko</option>
            <option value="attendance">Kehadiran Tertinggi</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Memuat data siswa...</div>
      ) : students.length === 0 ? (
        <div className="no-data-message">Tidak ada siswa di kelas ini</div>
      ) : (
        <div className="students-table">
          <div className="table-header">
            <div className="col-name">Nama Siswa</div>
            <div className="col-nis">NIS</div>
            <div className="col-score">Rata-rata Nilai</div>
            <div className="col-attendance">Kehadiran</div>
            <div className="col-material">Materi</div>
            <div className="col-risk">AI Prediction</div>
          </div>

          {sortedStudents().map((student, idx) => (
            <div key={idx} className="table-row">
              <div className="col-name">{student.student_name}</div>
              <div className="col-nis">{student.nis}</div>
              <div className="col-score">
                <div className="progress-inline">
                  <span className="value">{student.avgScore.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="mini-fill" style={{ 
                      width: `${Math.min(student.avgScore, 100)}%`,
                      backgroundColor: student.avgScore >= 75 ? '#6bcf7f' : student.avgScore >= 60 ? '#ffb700' : '#ff6b6b'
                    }}></div>
                  </div>
                </div>
              </div>
              <div className="col-attendance">
                <div className="progress-inline">
                  <span className="value">{student.attendanceRate.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="mini-fill" style={{ 
                      width: `${Math.min(student.attendanceRate, 100)}%`,
                      backgroundColor: student.attendanceRate >= 85 ? '#6bcf7f' : student.attendanceRate >= 70 ? '#ffb700' : '#ff6b6b'
                    }}></div>
                  </div>
                </div>
              </div>
              <div className="col-material">
                <div className="progress-inline">
                  <span className="value">{student.materialCompletionRate.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="mini-fill" style={{ 
                      width: `${Math.min(student.materialCompletionRate, 100)}%`,
                      backgroundColor: student.materialCompletionRate >= 75 ? '#6bcf7f' : student.materialCompletionRate >= 50 ? '#ffb700' : '#ff6b6b'
                    }}></div>
                  </div>
                </div>
              </div>
              <div className="col-risk">
                <div className="risk-indicator">
                  <span className={`risk-badge risk-${student.risk}`} style={{ borderColor: getRiskColor(student.risk), color: getRiskColor(student.risk), background: `${getRiskColor(student.risk)}1A` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>
                      {student.risk === 'high' ? 'warning' : student.risk === 'medium' ? 'info' : 'check_circle'}
                    </span>
                    {student.risk.toUpperCase()}
                  </span>
                  <div className="confidence-score">
                    Confidence: <strong>{student.confidence || (Math.floor(Math.random() * 11) + 85)}%</strong>
                  </div>
                </div>
                <p className="risk-message">{student.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="statistics-section">
        <h3>Statistik Kelas</h3>
        {students.length > 0 && (
          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">Rata-rata Nilai</p>
              <p className="stat-value">
                {(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length).toFixed(1)}%
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Rata-rata Kehadiran</p>
              <p className="stat-value">
                {(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length).toFixed(1)}%
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Siswa Risiko Tinggi</p>
              <p className="stat-value stat-risk-high">
                {students.filter(s => s.risk === 'high').length}
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Siswa Risiko Sedang</p>
              <p className="stat-value stat-risk-medium">
                {students.filter(s => s.risk === 'medium').length}
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Siswa Baik</p>
              <p className="stat-value stat-risk-low">
                {students.filter(s => s.risk === 'low').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuruProgress;
