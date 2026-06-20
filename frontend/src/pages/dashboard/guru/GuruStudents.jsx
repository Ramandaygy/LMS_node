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
                    <button className="btn-detail">Detail</button>
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
    </div>
  );
};

export default GuruStudents;