import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css';

const GuruStudents = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const fetchMyStudents = async () => {
    try {
      const response = await api.get('/guru/students');
      const studentsData = response.data.students || [];
      const classSet = new Set(studentsData.map(s => s.class_name));
      const classList = Array.from(classSet).map(name => ({ name, value: name }));
      setAvailableClasses(classList);
      setStudents(studentsData);
      if (response.data.subjects) {
        setSubjects(response.data.subjects);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const getSubjectLabel = (code) => {
    const mapping = {
      'PAI': 'PAI',
      'PPKn': 'P. Pancasila',
      'BIN': 'B. Indo',
      'MAT': 'MTK',
      'IPA': 'IPA',
      'IPS': 'IPS',
      'BIG': 'Inggris',
      'SBK': 'Seni dan Pra',
      'PJOK': 'PJOK',
      'INF': 'Informatika',
      'BJW': 'B. Jawa'
    };
    return mapping[code] || code;
  };

  const filteredStudents = students.filter(student => {
    const fullName = student.full_name || '';
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) return <div className="loading">Memuat data siswa binaan...</div>;

  return (
    <div className="guru-dashboard-content">
      <div className="page-header-flex">
        <h2 className="page-title">👨‍🎓 Siswa Binaan (Wali Kelas)</h2>
        <div className="grade-legend">
          <span className="legend-item"><span className="dot red"></span> Tugas di bawah KKM (&lt;75)</span>
        </div>
      </div>

      <div className="filter-bar spreadsheet-filter-bar">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-modern"
          />
        </div>
        
        <div className="selectors-group">
          <div className="filter-select-wrapper">
            <span className="select-icon material-symbols-outlined">class</span>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="modern-select">
              <option value="">Semua Kelas Binaan</option>
              {availableClasses.map(cls => (
                <option key={cls.value} value={cls.value}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="student-table-container glass-container">
        <table className="student-table spreadsheet-table">
          <thead>
            <tr>
              <th rowSpan="2" className="text-center">No</th>
              <th rowSpan="2" className="text-left th-name-sticky">Nama Siswa</th>
              <th colSpan={subjects.length} className="text-center th-section-header">Rata-Rata Nilai Tugas Harian Mapel</th>
              <th rowSpan="2" className="text-center th-bold-header">Jumlah</th>
              <th rowSpan="2" className="text-center th-bold-header">Rata2</th>
              <th rowSpan="2" className="text-center th-bold-header">Rank</th>
              <th colSpan="4" className="text-center th-attendance-header">Kehadiran</th>
              <th rowSpan="2" className="text-center th-actions-sticky">Aksi</th>
            </tr>
            <tr>
              {subjects.map(sub => (
                <th key={sub._id} className="text-center th-subject-code-sub" title={sub.name}>
                  {getSubjectLabel(sub.code)}
                </th>
              ))}
              <th className="text-center th-att-header" title="Sakit">S</th>
              <th className="text-center th-att-header" title="Izin">I</th>
              <th className="text-center th-att-header" title="Alpha">A</th>
              <th className="text-center th-att-header" title="Jumlah Tidak Hadir">jmlh</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, idx) => {
                const totalScore = student.task_sum;
                const avgScore = student.task_avg;
                const rank = student.rank_task;
                
                return (
                  <tr key={student._id} className="spreadsheet-row">
                    <td className="text-center row-number">{idx + 1}</td>
                    <td className="student-name-cell th-name-sticky">{student.full_name}</td>
                    {subjects.map(sub => {
                      const score = student.tasks?.[sub._id.toString()];
                      const displayScore = score !== undefined && score !== null ? score : '-';
                      const isBelowKKM = typeof score === 'number' && score < 75;
                      
                      return (
                        <td key={sub._id} className={`text-center score-cell ${isBelowKKM ? 'kkm-fail' : ''}`}>
                          {displayScore}
                        </td>
                      );
                    })}
                    <td className="text-center font-semibold total-score-cell">{totalScore !== undefined ? totalScore : '-'}</td>
                    <td className="text-center font-semibold avg-score-cell">{avgScore !== undefined ? avgScore : '-'}</td>
                    <td className="text-center rank-cell">
                      <span className={`rank-pill rank-no-${rank}`}>
                        {rank}
                      </span>
                    </td>
                    <td className="text-center att-cell sick-color">{student.attendance?.sick || 0}</td>
                    <td className="text-center att-cell late-color">{student.attendance?.late || 0}</td>
                    <td className="text-center att-cell absent-color">{student.attendance?.absent || 0}</td>
                    <td className="text-center att-cell font-semibold total-att-color">{student.attendance?.total || 0}</td>
                    <td className="text-center th-actions-sticky">
                      <div className="spreadsheet-actions">
                        <button className="btn-action-view" onClick={() => handleDetailClick(student)} title="Rapor & Detail Nilai Ujian (ATS/AAS)">
                          <span className="material-symbols-outlined">visibility</span>
                          <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>Rapor</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6 + subjects.length + 4} className="text-center empty-table-state">
                  <span className="material-symbols-outlined empty-icon">group_off</span>
                  <p>Tidak ada data siswa binaan ditemukan</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL RAPOR DETAIL SISWA (ATS/AAS & TUGAS) */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content glass-modal report-card-modal" onClick={(e) => e.stopPropagation()} style={{ width: '850px', maxWidth: '95%' }}>
            <div className="report-card-header">
              <div className="header-meta">
                <h3>📖 Rapor & Detail Nilai Siswa</h3>
                <p className="subtitle">Laporan Hasil Belajar Formatif (Tugas) dan Sumatif (ATS/AAS)</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="student-profile-summary">
              <div className="profile-item">
                <span className="label">Nama Siswa</span>
                <span className="value font-bold">{selectedStudent.full_name}</span>
              </div>
              <div className="profile-item">
                <span className="label">NIS</span>
                <span className="value">{selectedStudent.nis}</span>
              </div>
              <div className="profile-item">
                <span className="label">Kelas</span>
                <span className="value">{selectedStudent.class_name}</span>
              </div>
            </div>

            <div className="report-table-wrapper">
              <table className="report-grades-table">
                <thead>
                  <tr>
                    <th>Mata Pelajaran</th>
                    <th className="text-center">Rata-Rata Tugas (Harian)</th>
                    <th className="text-center">Nilai ATS (UTS)</th>
                    <th className="text-center">Nilai AAS (UAS)</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(sub => {
                    const taskScore = selectedStudent.tasks?.[sub._id.toString()];
                    const examGrades = selectedStudent.grades?.[sub._id.toString()] || {};
                    const utsScore = examGrades.uts;
                    const uasScore = examGrades.uas;

                    return (
                      <tr key={sub._id}>
                        <td className="font-semibold">{sub.name}</td>
                        <td className={`text-center ${typeof taskScore === 'number' && taskScore < 75 ? 'text-red font-bold' : ''}`}>
                          {taskScore !== undefined && taskScore !== null ? taskScore : '-'}
                        </td>
                        <td className={`text-center ${typeof utsScore === 'number' && utsScore < 75 ? 'text-red font-bold' : ''}`}>
                          {utsScore !== undefined && utsScore !== null ? utsScore : '-'}
                        </td>
                        <td className={`text-center ${typeof uasScore === 'number' && uasScore < 75 ? 'text-red font-bold' : ''}`}>
                          {uasScore !== undefined && uasScore !== null ? uasScore : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Summary Rows */}
                  <tr className="summary-row border-top-double">
                    <td className="font-bold">Jumlah Nilai</td>
                    <td className="text-center font-bold">{selectedStudent.task_sum || '-'}</td>
                    <td className="text-center font-bold">{selectedStudent.uts_sum || '-'}</td>
                    <td className="text-center font-bold">{selectedStudent.uas_sum || '-'}</td>
                  </tr>
                  <tr className="summary-row">
                    <td className="font-bold">Rata-Rata Nilai</td>
                    <td className="text-center font-bold text-blue">{selectedStudent.task_avg || '-'}</td>
                    <td className="text-center font-bold text-blue">{selectedStudent.uts_avg || '-'}</td>
                    <td className="text-center font-bold text-blue">{selectedStudent.uas_avg || '-'}</td>
                  </tr>
                  <tr className="summary-row">
                    <td className="font-bold">Peringkat Kelas (Rank)</td>
                    <td className="text-center font-bold">
                      <span className="rank-badge-inline">Rank {selectedStudent.rank_task}</span>
                    </td>
                    <td className="text-center font-bold">
                      <span className="rank-badge-inline">Rank {selectedStudent.rank_uts}</span>
                    </td>
                    <td className="text-center font-bold">
                      <span className="rank-badge-inline">Rank {selectedStudent.rank_uas}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-footer-section">
              <div className="attendance-rekap-box">
                <h4>📊 Rekap Kehadiran Semester</h4>
                <div className="attendance-grid-summary">
                  <div className="att-summary-item sick">
                    <span className="title">Sakit (S)</span>
                    <span className="number">{selectedStudent.attendance?.sick || 0} hari</span>
                  </div>
                  <div className="att-summary-item permit">
                    <span className="title">Izin (I)</span>
                    <span className="number">{selectedStudent.attendance?.late || 0} hari</span>
                  </div>
                  <div className="att-summary-item absent">
                    <span className="title">Alpha (A)</span>
                    <span className="number">{selectedStudent.attendance?.absent || 0} hari</span>
                  </div>
                  <div className="att-summary-item total">
                    <span className="title">Total Tidak Hadir</span>
                    <span className="number font-bold">{selectedStudent.attendance?.total || 0} hari</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-buttons" style={{ marginTop: '24px' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                Tutup Rapor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruStudents;