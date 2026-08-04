import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-progress.css';

const StudentCard = ({ student, insights }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`student-progress-card premium-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <div className="student-info-cell">
          <div className="student-avatar">
            {student.student_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="student-name">{student.student_name}</div>
            <div className="student-nis">NIS: {student.nis}</div>
          </div>
        </div>
        <div className="risk-cell" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
          <span className={`risk-badge risk-${student.risk}`}>
            <span className="material-symbols-outlined">
              {student.risk === 'high' ? 'warning' : student.risk === 'medium' ? 'info' : 'verified'}
            </span>
            {student.risk === 'high' ? 'Risiko Tinggi' : student.risk === 'medium' ? 'Risiko Sedang' : 'Risiko Rendah'}
          </span>
          <button className="btn-detail" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Detail
            <span className="material-symbols-outlined" style={{ fontSize: '18px', transition: 'transform 0.3s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          <div className="ai-insight-box">
            <div className="insight-header">
              <span className="material-symbols-outlined">psychology</span>
              <strong>Insight Prediksi AI</strong>
            </div>
            <p className="insight-summary">{student.message}</p>
            <ul className="insight-factors">
              {insights.map((insight, i) => (
                <li key={i}>
                  <span className="material-symbols-outlined factor-icon">
                    {insight.includes('rendah') || insight.includes('kurang') || insight.includes('minim') || insight.includes('belum') || insight.includes('anomali') || insight.includes('Tinggi') ? 'trending_down' : 'trending_up'}
                  </span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Tugas</span>
              <div className="progress-cell">
                <span className="progress-text">{student.avgScore.toFixed(0)}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ 
                    width: `${Math.min(student.avgScore, 100)}%`,
                    backgroundColor: student.avgScore >= 75 ? '#10b981' : student.avgScore >= 60 ? '#f59e0b' : '#ef4444'
                  }}></div>
                </div>
              </div>
            </div>

            <div className="metric-item">
              <span className="metric-label">Kuis</span>
              <div className="progress-cell">
                <span className="progress-text">{(student.avgQuizScore || 0).toFixed(0)}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ 
                    width: `${Math.min(student.avgQuizScore || 0, 100)}%`,
                    backgroundColor: (student.avgQuizScore || 0) >= 75 ? '#10b981' : (student.avgQuizScore || 0) >= 60 ? '#f59e0b' : '#ef4444'
                  }}></div>
                </div>
              </div>
            </div>

            <div className="metric-item">
              <span className="metric-label">Kehadiran</span>
              <div className="progress-cell">
                <span className="progress-text">{student.attendanceRate.toFixed(0)}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ 
                    width: `${Math.min(student.attendanceRate, 100)}%`,
                    backgroundColor: student.attendanceRate >= 85 ? '#10b981' : student.attendanceRate >= 70 ? '#f59e0b' : '#ef4444'
                  }}></div>
                </div>
              </div>
            </div>

            <div className="metric-item">
              <span className="metric-label">Materi</span>
              <div className="progress-cell">
                <span className="progress-text">{student.materialCompletionRate.toFixed(0)}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ 
                    width: `${Math.min(student.materialCompletionRate, 100)}%`,
                    backgroundColor: student.materialCompletionRate >= 75 ? '#10b981' : student.materialCompletionRate >= 50 ? '#f59e0b' : '#ef4444'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GuruProgress = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, sortBy]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/guru/students');
      const hrClassName = res.data.homeroom_class || null;
      const tCls = res.data.teacher_classes || [];

      // Normalize teacher classes to have _id and name
      const normalizedClasses = tCls.map(c => ({
        _id: c.id || c._id || '',
        name: c.name || ''
      }));

      let finalClasses = [];
      if (hrClassName) {
        // Wali kelas: ONLY show their perwalian class!
        const hrClassObj = normalizedClasses.find(c => c.name === hrClassName);
        if (hrClassObj) {
          finalClasses = [hrClassObj];
        } else {
          finalClasses = [{ _id: hrClassName, name: hrClassName }];
        }
      } else {
        // Guru mapel: show all classes they teach
        finalClasses = normalizedClasses;
      }

      setClasses(finalClasses);
      if (finalClasses.length > 0) {
        setSelectedClass(finalClasses[0]._id);
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

  return (
    <div className="guru-progress-container">
      <div className="page-header">
        <div className="header-title">
          <h2>Monitoring Progres Siswa</h2>
          <p>Analisis Kualifikasi Perkembangan Siswa Berbasis Standar KKM 75</p>
        </div>
      </div>

      <div className="feature-info-card premium-card">
        <div className="feature-icon">
           <span className="material-symbols-outlined">rule</span>
        </div>
        <div className="feature-text">
           <h4>Sistem Kualifikasi Risiko Belajar (Rule-Based Engine)</h4>
           <p>Sistem ini menggunakan <strong>Rule-Based Classification Engine</strong> berbasis ambang batas resmi (KKM 75 & Presensi 85%) untuk mengklasifikasikan status risiko belajar siswa secara transparan berdasarkan data gabungan dari <strong>Nilai Tugas, Nilai Kuis, Kehadiran, dan Penyelesaian Materi</strong>.</p>
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
      ) : (() => {
        const allSorted = sortedStudents();

        return (
          <div className="table-responsive premium-card" style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: '800' }}>
                  <th style={{ padding: '14px 12px' }}>Nama Siswa</th>
                  <th style={{ padding: '14px 12px' }}>NIS</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center' }}>Rerata Tugas</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center' }}>Rerata Kuis</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center' }}>Kehadiran</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center' }}>Penyelesaian Materi</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center' }}>Status Risiko</th>
                  <th style={{ padding: '14px 12px', whiteSpace: 'normal' }}>Rekomendasi / Insight AI</th>
                </tr>
              </thead>
              <tbody>
                {allSorted.map((student, idx) => {
                  const insights = [];
                  if (student.attendanceRate < 70) insights.push(`Kehadiran sangat rendah (${student.attendanceRate.toFixed(0)}%).`);
                  else if (student.attendanceRate < 85) insights.push(`Kehadiran kurang optimal (${student.attendanceRate.toFixed(0)}%).`);

                  if (student.avgScore < 60) insights.push(`Tugas kurang (${student.avgScore.toFixed(0)}%).`);
                  else if (student.avgScore < 75) insights.push(`Tugas perlu ditingkatkan (${student.avgScore.toFixed(0)}%).`);

                  if (student.avgQuizScore < 60) insights.push(`Kuis minim (${(student.avgQuizScore || 0).toFixed(0)}%).`);
                  if (student.materialCompletionRate < 50) insights.push(`Materi belum selesai (${student.materialCompletionRate.toFixed(0)}%).`);

                  const finalInsight = insights.length > 0 ? insights.join(' ') : (student.risk === 'low' ? 'Konsisten di semua aspek.' : 'Performa cukup.');

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0f172a' }}>
                        {student.student_name}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#64748b', fontWeight: '600' }}>{student.nis}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '800', color: student.avgScore >= 75 ? '#16a34a' : '#ea580c' }}>
                        {student.avgScore.toFixed(0)}%
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '800', color: (student.avgQuizScore || 0) >= 75 ? '#16a34a' : '#ea580c' }}>
                        {(student.avgQuizScore || 0).toFixed(0)}%
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '800', color: student.attendanceRate >= 85 ? '#16a34a' : '#dc2626' }}>
                        {student.attendanceRate.toFixed(0)}%
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '800', color: student.materialCompletionRate >= 75 ? '#16a34a' : '#ea580c' }}>
                        {student.materialCompletionRate.toFixed(0)}%
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span className={`risk-badge risk-${student.risk}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '11px',
                          background: student.risk === 'high' ? '#fee2e2' : student.risk === 'medium' ? '#fef3c7' : '#dcfce7',
                          color: student.risk === 'high' ? '#b91c1c' : student.risk === 'medium' ? '#b45309' : '#15803d'
                        }}>
                          {student.risk === 'high' ? 'Risiko Tinggi' : student.risk === 'medium' ? 'Risiko Sedang' : 'Risiko Rendah'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', color: '#475569', maxWidth: '320px', fontSize: '12px', fontStyle: 'italic', whiteSpace: 'normal', lineHeight: '1.5' }}>
                        {student.message || finalInsight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

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
