import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Quiz Questions State
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Scoring Detail State
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState(null);
  const [studentScores, setStudentScores] = useState({});

  useEffect(() => {
    fetchStudents();
    fetchTeacherProfile();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data && res.data.subjects) {
        setSubjects(res.data.subjects);
        if (res.data.subjects.length > 0) {
          setSelectedSubject(res.data.subjects[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users/students/all');
      const data = response.data.data || [];
      setStudents(data);

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

  const handleScoreChange = (studentId, value) => {
    setStudentScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleInlineSubmitScore = async (student, questionIndex) => {
    const score = studentScores[student._id];
    if (!score) return;

    try {
      await api.post('/grades', {
        student: student._id,
        subject: student.subject_id || selectedSubject || 'dummy_subject_id_for_now',
        score: Number(score),
        type: 'quiz',
        note: `Kuis: ${questions[questionIndex]}`
      });
      alert(`Berhasil memberikan nilai ${score} ke ${student.full_name}`);
      setStudentScores(prev => ({ ...prev, [student._id]: '' }));
    } catch (err) {
      console.error('Failed to submit score', err);
      alert('Gagal menyimpan nilai kuis');
    }
  };

  // Questions Handlers
  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (newQuestion.trim() === '') return;
    setQuestions([...questions, newQuestion]);
    setNewQuestion('');
  };

  const handleDeleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleGenerateAI = async () => {
    if (!selectedSubject) {
      alert('Pilih mata pelajaran terlebih dahulu');
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await api.post('/materials/generate-quiz-ai', {
        subject_name: selectedSubject
      });
      if (res.data && res.data.success) {
        setQuestions([...questions, res.data.data.question]);
      } else {
        alert('Gagal menghasilkan pertanyaan dari AI');
      }
    } catch (err) {
      console.error('Failed to generate AI question', err);
      alert(err.response?.data?.message || 'Gagal menghasilkan pertanyaan dari AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredStudents = students.filter(s => s.class_name === selectedClass);

  if (loading) return <div className="quiz-loading">Memuat data kuis...</div>;

  return (
    <div className="quiz-page-container">
      <div className="quiz-header-global">
        <h2>💡 Quiz Live</h2>
        <p>Buat pertanyaan kuis dan nilai siswa secara langsung</p>
      </div>

      <div className="quiz-single-layout">
        
        <div className="quiz-questions-panel">
          <div className="panel-header">
            <h3>Bank Soal</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {subjects.length > 0 && (
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  {subjects.map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}
              <button 
                className={`btn-ai-generate ${isGenerating ? 'loading' : ''}`}
                onClick={handleGenerateAI}
                disabled={isGenerating}
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>

          <form onSubmit={handleAddQuestion} className="question-input-form">
            <input 
              type="text" 
              placeholder="Ketik pertanyaan kuis manual di sini..." 
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <button type="submit" className="btn-add-q">Tambah</button>
          </form>

          <div className="questions-list">
            {questions.length === 0 ? (
              <div className="empty-state">
                Belum ada pertanyaan. Ketik manual atau generate menggunakan AI.
              </div>
            ) : (
              questions.map((q, index) => (
                <div key={index} className="question-card-container">
                  <div className="question-card">
                    <div className="q-number">{index + 1}</div>
                    <div className="q-text">{q}</div>
                    <div className="q-actions">
                      <button 
                        className="btn-detail-q" 
                        onClick={() => setExpandedQuestionIndex(expandedQuestionIndex === index ? null : index)}
                      >
                        Detail
                      </button>
                      <button className="btn-del-q" onClick={() => handleDeleteQuestion(index)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                  
                  {expandedQuestionIndex === index && (
                    <div className="question-detail-expanded">
                      <div className="detail-header">
                         <h4>Pilih Kelas & Beri Nilai</h4>
                         <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="class-selector">
                           {classes.map(c => (
                             <option key={c} value={c}>{c}</option>
                           ))}
                         </select>
                      </div>
                      <div className="student-grid">
                        {filteredStudents.length === 0 ? (
                          <div className="no-students">Tidak ada siswa di kelas ini.</div>
                        ) : (
                          filteredStudents.map(student => (
                            <div key={student._id} className="student-score-row">
                              <div className="student-score-info">
                                <div className="student-avatar-small">{student.full_name.charAt(0)}</div>
                                <div>
                                  <div className="student-name">{student.full_name}</div>
                                  <div className="student-nis">{student.nis || '-'}</div>
                                </div>
                              </div>
                              <div className="score-input-group">
                                <input 
                                  type="number" 
                                  placeholder="Nilai" 
                                  value={studentScores[student._id] || ''}
                                  onChange={e => handleScoreChange(student._id, e.target.value)}
                                  className="score-input"
                                />
                                <button className="btn-save-score" onClick={() => handleInlineSubmitScore(student, index)}>Simpan</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuruQuiz;
