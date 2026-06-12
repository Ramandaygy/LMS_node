import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [quizScore, setQuizScore] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users/students/all');
      const data = response.data.data || [];
      setStudents(data);

      // Extract unique classes
      const classList = [...new Set(data.map(s => s.class_name).filter(Boolean))];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClass(classList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !quizScore) return;

    setIsSubmitting(true);
    try {
      await api.post('/grades', {
        student: selectedStudent._id,
        subject: selectedStudent.subject_id || 'dummy_subject_id_for_now', // Real app needs subject selection
        score: Number(quizScore),
        type: 'quiz',
        note: 'Icebreaker Quiz Point'
      });
      alert(`Berhasil memberikan nilai ${quizScore} ke ${selectedStudent.full_name}`);
      setShowModal(false);
      setQuizScore(10); // reset default
    } catch (err) {
      console.error('Failed to submit score', err);
      alert('Gagal menyimpan nilai kuis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => s.class_name === selectedClass);

  if (loading) return <div className="quiz-loading">Memuat data kelas...</div>;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div>
          <h2>💡 Quiz Live</h2>
          <p>Berikan poin kuis secara langsung kepada siswa yang aktif menjawab</p>
        </div>
        <div className="class-selector">
          <label>Pilih Kelas:</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="student-grid">
        {filteredStudents.length === 0 ? (
          <div className="no-students">Tidak ada siswa di kelas ini.</div>
        ) : (
          filteredStudents.map(student => (
            <div key={student._id} className="student-card" onClick={() => handleStudentClick(student)}>
              <div className="student-avatar">
                {student.full_name.charAt(0)}
              </div>
              <div className="student-info">
                <h4>{student.full_name}</h4>
                <p>NIS: {student.nis || '-'}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Input Nilai Quiz</h3>
            <p className="modal-subtitle">Berikan poin kuis untuk <strong>{selectedStudent.full_name}</strong></p>
            <form onSubmit={handleSubmitScore}>
              <div className="form-group">
                <label>Nilai Poin (Misal: 10, 20, 100)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={quizScore} 
                  onChange={e => setQuizScore(e.target.value)} 
                  required 
                  autoFocus
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
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

export default GuruQuiz;
