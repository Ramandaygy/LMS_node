import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSaveAllScores = async (questionIndex) => {
    const scoresToSubmit = Object.entries(studentScores).filter(([_, score]) => score !== '');
    if (scoresToSubmit.length === 0) {
      alert('Tidak ada nilai baru yang dimasukkan.');
      return;
    }

    const subjectObj = subjects.find(s => s.name === selectedSubject);
    if (!subjectObj) {
      alert('Pilih mata pelajaran terlebih dahulu.');
      return;
    }

    let successCount = 0;
    try {
      await Promise.all(
        scoresToSubmit.map(async ([studentId, score]) => {
          await api.post('/grades', {
            student: studentId,
            subject: subjectObj._id,
            score: Number(score),
            type: 'quiz',
            note: `Quiz Live: ${questions[questionIndex]}`
          });
          successCount++;
        })
      );
      alert(`Berhasil menyimpan ${successCount} nilai kuis.`);
      setStudentScores({});
    } catch (err) {
      console.error('Failed to submit some scores', err);
      alert('Terjadi kesalahan saat menyimpan beberapa nilai. Silakan coba lagi.');
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
        subject: selectedSubject,
        topic: 'Umum Bab 1-3'
      });
      if (res.data && res.data.questions) {
        setQuestions(prev => [...prev, ...res.data.questions]);
      }
    } catch (err) {
      console.error('Failed to generate AI quiz', err);
      alert('Gagal membuat kuis otomatis via AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchClass = selectedClass ? s.class_name === selectedClass : true;
    const matchQuery = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       s.nis?.includes(searchQuery);
    return matchClass && matchQuery;
  });

  return (
    <div className="guru-quiz-container">
      <div className="guru-quiz-header">
        <div>
          <h1 className="page-title">Manajemen Quiz Live & Generator AI</h1>
          <p className="page-subtitle">Buat pertanyaan kuis cepat secara manual atau otomatis dengan AI, lalu input nilai siswa sekelas.</p>
        </div>
      </div>

      <div className="quiz-layout-grid">
        {/* Left Side: Question Builder */}
        <div className="quiz-card">
          <div className="quiz-card-header">
            <h3>Bank Pertanyaan Quiz Live</h3>
            <button className="btn-ai-gen" onClick={handleGenerateAI} disabled={isGenerating}>
              <span className="material-symbols-outlined">auto_awesome</span>
              {isGenerating ? 'Generasi AI...' : 'Buat Kuis via AI'}
            </button>
          </div>

          <form onSubmit={handleAddQuestion} className="quiz-form-input">
            <input
              type="text"
              placeholder="Ketik pertanyaan kuis di sini..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="form-input"
            />
            <button type="submit" className="btn-add-q">Tambah</button>
          </form>

          <div className="questions-list">
            {questions.length === 0 ? (
              <p className="empty-msg">Belum ada pertanyaan kuis. Silakan ketik atau buat otomatis via AI.</p>
            ) : (
              questions.map((q, idx) => (
                <div key={idx} className="question-list-item">
                  <div className="q-info">
                    <span className="q-badge">Soal #{idx + 1}</span>
                    <p className="q-text">{q}</p>
                  </div>
                  <div className="q-actions">
                    <button
                      className="btn-input-score"
                      onClick={() => setExpandedQuestionIndex(expandedQuestionIndex === idx ? null : idx)}
                    >
                      <span className="material-symbols-outlined">edit_note</span>
                      {expandedQuestionIndex === idx ? 'Tutup Nilai' : 'Input Nilai'}
                    </button>
                    <button className="btn-del-q" onClick={() => handleDeleteQuestion(idx)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Class Student Scoring Table */}
        <div className="quiz-card">
          <div className="quiz-card-header">
            <h3>Pilih Kelas & Siswa</h3>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="select-class-dropdown"
            >
              {classes.map((c, i) => (
                <option key={i} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama/NIS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-field"
          />

          {expandedQuestionIndex !== null && (
            <div className="input-score-banner">
              <strong>Penginputan Nilai untuk Soal #{expandedQuestionIndex + 1}:</strong> "{questions[expandedQuestionIndex]}"
            </div>
          )}

          {loading ? (
            <div className="loading-state">Memuat siswa...</div>
          ) : (
            <div className="student-scoring-table-wrapper">
              <table className="scoring-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Siswa</th>
                    <th>NIS</th>
                    <th>Input Nilai Kuis (0-100)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st, i) => (
                    <tr key={st._id}>
                      <td>{i + 1}</td>
                      <td><strong>{st.full_name}</strong></td>
                      <td>{st.nis || '-'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Nilai..."
                          value={studentScores[st._id] || ''}
                          onChange={(e) => handleScoreChange(st._id, e.target.value)}
                          className="score-input-cell"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {expandedQuestionIndex !== null && (
                <div className="save-score-footer">
                  <button
                    className="btn-save-all-scores"
                    onClick={() => handleSaveAllScores(expandedQuestionIndex)}
                  >
                    <span className="material-symbols-outlined">save</span>
                    Simpan Seluruh Nilai Kuis
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuruQuiz;
