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
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
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
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="guru-dashboard-content">
      <h2 className="page-title">👨‍🎓 Siswa Binaan</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Cari nama atau NIS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Semua Kelas</option>
          {availableClasses.map(cls => (
            <option key={cls.value} value={cls.value}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="student-table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>NIS</th>
              <th>Kelas</th>
              <th>Progress</th>
              <th>Rata-rata</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <tr key={student._id}>
                  <td>{student.full_name}</td>
                  <td>{student.nis}</td>
                  <td>{student.class_name}</td>
                  <td>
                    <div className="progress-small">
                      <div className="progress-fill" style={{ width: `${student.progress || 0}%` }}></div>
                      <span>{student.progress || 0}%</span>
                    </div>
                  </td>
                  <td>{student.average_grade || '-'}</td>
                  <td>
                    <button className="btn-detail" onClick={() => handleDetailClick(student)}>Detail</button>
                    <button className="btn-grade" onClick={() => handleInputNilaiClick(student)}>Input Nilai</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center">Tidak ada data siswa ditemukan</td>
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