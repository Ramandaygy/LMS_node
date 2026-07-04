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
  const [examType, setExamType] = useState('uts'); // 'uts' (ATS) or 'uas' (AAS)

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeData, setGradeData] = useState({
    subject_id: '',
    type: 'uts',
    score: '',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    fetchMyStudents();
    fetchSubjects();
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

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      // Fallback only if getBinaanStudents didn't populate subjects
      setSubjects(prev => prev.length > 0 ? prev : (response.data.data || []));
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
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


  const handleInputNilaiClick = (student) => {
    setSelectedStudent(student);
    setGradeData({
      subject_id: subjects.length > 0 ? subjects[0]._id : '',
      type: 'uts',
      score: '',
      note: ''
    });
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const handleDetailClick = async (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
    setLoadingGrades(true);
    try {
      const res = await api.get(`/guru/students/${student._id}/grades`);
      setStudentGrades(res.data.grades || []);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setStudentGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        student_id: selectedStudent._id,
        subject_id: gradeData.subject_id,
        type: gradeData.type,
        score: Number(gradeData.score),
        note: gradeData.note
      };

      const response = await api.post('/guru/grades/input', payload);
      setMessage({ type: 'success', text: response.data.message || 'Nilai berhasil disimpan!' });
      
      setTimeout(() => {
        setShowModal(false);
        setMessage({ type: '', text: '' });
      }, 1500);

    } catch (error) {
      console.error('Error submitting grade:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menyimpan nilai.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = student.full_name || '';
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="guru-dashboard-content">
      <div className="page-header-flex">
        <h2 className="page-title">👨‍🎓 Siswa Binaan (Wali Kelas)</h2>
        <div className="grade-legend">
          <span className="legend-item"><span className="dot red"></span> Nilai di bawah KKM (&lt;75)</span>
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
            <span className="select-icon material-symbols-outlined">analytics</span>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className="modern-select">
              <option value="uts">UTS (Asesmen Tengah Semester / ATS)</option>
              <option value="uas">UAS (Asesmen Akhir Semester / AAS)</option>
            </select>
          </div>

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
              {subjects.map(sub => (
                <th key={sub._id} rowSpan="2" className="text-center th-subject-code" title={sub.name}>
                  {getSubjectLabel(sub.code)}
                </th>
              ))}
              <th rowSpan="2" className="text-center th-bold-header">Jumlah</th>
              <th rowSpan="2" className="text-center th-bold-header">Rata2</th>
              <th rowSpan="2" className="text-center th-bold-header">Rank</th>
              <th colSpan="4" className="text-center th-attendance-header">Kehadiran</th>
              <th rowSpan="2" className="text-center th-actions-sticky">Aksi</th>
            </tr>
            <tr>
              <th className="text-center th-att-header" title="Sakit">S</th>
              <th className="text-center th-att-header" title="Izin">I</th>
              <th className="text-center th-att-header" title="Alpha">A</th>
              <th className="text-center th-att-header" title="Jumlah Tidak Hadir">jmlh</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, idx) => {
                const totalScore = examType === 'uts' ? student.uts_sum : student.uas_sum;
                const avgScore = examType === 'uts' ? student.uts_avg : student.uas_avg;
                const rank = examType === 'uts' ? student.rank_uts : student.rank_uas;
                
                return (
                  <tr key={student._id} className="spreadsheet-row">
                    <td className="text-center row-number">{idx + 1}</td>
                    <td className="student-name-cell th-name-sticky">{student.full_name}</td>
                    {subjects.map(sub => {
                      const studentGrades = student.grades?.[sub._id.toString()] || {};
                      const score = examType === 'uts' ? studentGrades.uts : studentGrades.uas;
                      const displayScore = score !== undefined && score !== null ? score : '-';
                      const isBelowKKM = typeof score === 'number' && score < 75;
                      
                      return (
                        <td key={sub._id} className={`text-center score-cell ${isBelowKKM ? 'kkm-fail' : ''}`}>
                          {displayScore}
                        </td>
                      );
                    })}
                    <td className="text-center font-semibold total-score-cell">{totalScore || '-'}</td>
                    <td className="text-center font-semibold avg-score-cell">{avgScore || '-'}</td>
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
                        <button className="btn-action-view" onClick={() => handleDetailClick(student)} title="Detail Nilai">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button className="btn-action-edit" onClick={() => handleInputNilaiClick(student)} title="Input Nilai">
                          <span className="material-symbols-outlined">edit</span>
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


      {/* MODAL INPUT NILAI */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Input Nilai: {selectedStudent.full_name}</h3>
            
            {message.text && (
              <div className={`alert ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleGradeSubmit}>
              <div className="form-group">
                <label>Mata Pelajaran *</label>
                <select 
                  value={gradeData.subject_id} 
                  onChange={(e) => setGradeData({...gradeData, subject_id: e.target.value})}
                  required
                >
                  <option value="" disabled>Pilih Mata Pelajaran</option>
                  {subjects.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Jenis Ujian *</label>
                <select 
                  value={gradeData.type} 
                  onChange={(e) => setGradeData({...gradeData, type: e.target.value})}
                  required
                >
                  <option value="uts">UTS (Ujian Tengah Semester)</option>
                  <option value="uas">UAS (Ujian Akhir Semester)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nilai (0-100) *</label>
                <input 
                  type="number" 
                  min="0" max="100" 
                  value={gradeData.score} 
                  onChange={(e) => setGradeData({...gradeData, score: e.target.value})}
                  placeholder="Contoh: 85"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Catatan (Opsional)</label>
                <textarea 
                  rows="3"
                  value={gradeData.note} 
                  onChange={(e) => setGradeData({...gradeData, note: e.target.value})}
                  placeholder="Tambahkan catatan untuk siswa..."
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Batal
                </button>
                <button type="submit" className="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SISWA */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content glass-modal" onClick={(e) => e.stopPropagation()} style={{ width: '600px' }}>
            <h3>Detail & Riwayat Nilai: {selectedStudent.full_name}</h3>
            
            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 8px' }}><strong>NIS:</strong> {selectedStudent.nis}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Kelas:</strong> {selectedStudent.class_name}</p>
            </div>

            <h4>Riwayat Nilai UTS/UAS</h4>
            {loadingGrades ? (
              <p>Memuat nilai...</p>
            ) : studentGrades.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Mata Pelajaran</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Jenis</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {studentGrades.map((grade) => (
                    <tr key={grade._id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{grade.subject?.name || 'Tidak diketahui'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' }}>{grade.type}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 'bold' }}>{grade.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Belum ada riwayat nilai untuk siswa ini.</p>
            )}

            <div className="modal-buttons">
              <button type="button" className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruStudents;