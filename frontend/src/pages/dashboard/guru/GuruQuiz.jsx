import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  // Quiz Questions State: array of { text, answer, showAnswer }
  const [questions, setQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newAnswerText, setNewAnswerText] = useState('');
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
    const targetSubjectId = subjectObj ? subjectObj._id : (subjects[0] ? subjects[0]._id : null);
    if (!targetSubjectId) {
      alert('Pilih mata pelajaran terlebih dahulu.');
      return;
    }

    const qItem = questions[questionIndex];
    const qText = typeof qItem === 'object' ? qItem.text : qItem;

    let successCount = 0;
    try {
      await Promise.all(
        scoresToSubmit.map(async ([studentId, score]) => {
          await api.post('/grades', {
            student: studentId,
            subject: targetSubjectId,
            score: Number(score),
            type: 'quiz',
            note: `Quiz Live: ${qText}`
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
    if (!newQuestionText.trim()) return;

    setQuestions(prev => [
      ...prev,
      {
        text: newQuestionText.trim(),
        answer: newAnswerText.trim(),
        showAnswer: false
      }
    ]);
    setNewQuestionText('');
    setNewAnswerText('');
  };

  const handleDeleteQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleShowAnswer = (index) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        return typeof q === 'object' ? { ...q, showAnswer: !q.showAnswer } : { text: q, answer: '', showAnswer: true };
      }
      return q;
    }));
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const targetSubjectName = selectedSubject || (subjects[0] ? subjects[0].name : 'Umum');
      const res = await api.post('/materials/generate-quiz-ai', {
        subject_name: targetSubjectName,
        subject: targetSubjectName
      });

      if (res.data) {
        const rawList = res.data.questions || [res.data.data?.question];
        const formatted = rawList.filter(Boolean).map(item => {
          if (typeof item === 'object') {
            return {
              text: item.question || item.text || JSON.stringify(item),
              answer: item.answer || item.kunci || '',
              showAnswer: false
            };
          }
          return { text: String(item), answer: '', showAnswer: false };
        });

        setQuestions(prev => [...prev, ...formatted]);
      }
    } catch (err) {
      console.error('Failed to generate AI quiz', err);
      alert('Gagal membuat kuis otomatis via AI: ' + (err.response?.data?.message || err.message));
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
          <p className="page-subtitle">Buat pertanyaan kuis cepat manual/AI, sembunyikan kunci jawaban untuk dibahas bersama, dan input nilai siswa sekelas.</p>
        </div>
      </div>

      <div className="quiz-layout-grid">
        {/* Left Side: Question Builder */}
        <div className="quiz-card">
          <div className="quiz-card-header">
            <div>
              <h3>Bank Pertanyaan Quiz Live</h3>
              {subjects.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  Mapel: 
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {subjects.map((sub) => (
                      <option key={sub._id || sub.name} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button className="btn-ai-gen" onClick={handleGenerateAI} disabled={isGenerating}>
              <span className="material-symbols-outlined">auto_awesome</span>
              {isGenerating ? 'Generasi AI...' : 'Buat Kuis via AI'}
            </button>
          </div>

          <form onSubmit={handleAddQuestion} className="quiz-form-input-box">
            <input
              type="text"
              required
              placeholder="Ketik pertanyaan kuis di sini..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Kunci Jawaban / Pembahasan (Opsional)..."
              value={newAnswerText}
              onChange={(e) => setNewAnswerText(e.target.value)}
              className="form-input answer-input-opt"
            />
            <button type="submit" className="btn-add-q">
              <span className="material-symbols-outlined">add</span> Tambah Soal
            </button>
          </form>

          <div className="questions-list">
            {questions.length === 0 ? (
              <p className="empty-msg">Belum ada pertanyaan kuis. Silakan ketik atau klik "Buat Kuis via AI" di atas.</p>
            ) : (
              questions.map((qItem, idx) => {
                const qText = typeof qItem === 'object' ? qItem.text : qItem;
                const qAns = typeof qItem === 'object' ? qItem.answer : '';
                const isShowAns = typeof qItem === 'object' ? qItem.showAnswer : false;

                return (
                  <div key={idx} className="question-list-item-card">
                    <div className="q-card-top">
                      <div className="q-info">
                        <span className="q-badge">Soal #{idx + 1}</span>
                        <p className="q-text">{qText}</p>
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

                    {/* Hidden Answer Key & Discussion Box */}
                    {qAns && (
                      <div className="answer-key-section">
                        <button
                          type="button"
                          className="btn-toggle-answer"
                          onClick={() => handleToggleShowAnswer(idx)}
                        >
                          <span className="material-symbols-outlined">
                            {isShowAns ? 'visibility_off' : 'visibility'}
                          </span>
                          {isShowAns ? 'Sembunyikan Kunci Jawaban' : 'Tampilkan Kunci Jawaban (Bahas Bersama)'}
                        </button>

                        {isShowAns && (
                          <div className="revealed-answer-box">
                            <strong>Kunci Jawaban & Pembahasan:</strong>
                            <p>{qAns}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
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
              <strong>Penginputan Nilai untuk Soal #{expandedQuestionIndex + 1}:</strong> "{typeof questions[expandedQuestionIndex] === 'object' ? questions[expandedQuestionIndex].text : questions[expandedQuestionIndex]}"
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
