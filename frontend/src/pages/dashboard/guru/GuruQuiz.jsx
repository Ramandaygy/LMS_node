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
      const [profRes, subRes] = await Promise.all([
        api.get('/profile'),
        api.get('/subjects')
      ]);

      const rawTeacherSubjects = profRes.data?.subjects || [];
      const allMasterSubjects = subRes.data?.data || [];

      let names = [];
      if (Array.isArray(rawTeacherSubjects) && rawTeacherSubjects.length > 0) {
        names = rawTeacherSubjects.map(s => {
          if (typeof s === 'object' && s.name) return s.name;
          const found = allMasterSubjects.find(sub => String(sub._id) === String(s));
          return found ? found.name : null;
        }).filter(Boolean);
      }

      if (names.length === 0 && allMasterSubjects.length > 0) {
        names = allMasterSubjects.map(s => s.name).filter(Boolean);
      }

      if (names.length === 0) {
        names = ['Informatika', 'Bahasa Indonesia', 'Matematika', 'IPA'];
      }

      const uniqueNames = [...new Set(names)];
      setSubjects(uniqueNames);
      setSelectedSubject(uniqueNames[0]);
    } catch (err) {
      console.error('Failed to fetch teacher profile/subjects', err);
      setSubjects(['Informatika', 'Bahasa Indonesia', 'Matematika', 'IPA']);
      setSelectedSubject('Informatika');
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
        answer: '',
        showAnswer: false
      }
    ]);
    setNewQuestionText('');
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

      if (res.data && res.data.success) {
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
          <p className="page-subtitle">Buat pertanyaan kuis cepat manual atau via AI (lengkap dengan kunci jawaban tersembunyi), lalu input nilai siswa sekelas.</p>
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
                  Mata Pelajaran: 
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {subjects.map((sub, idx) => (
                      <option key={idx} value={typeof sub === 'object' ? sub.name : sub}>
                        {typeof sub === 'object' ? sub.name : sub}
                      </option>
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

          <form onSubmit={handleAddQuestion} className="quiz-form-input">
            <input
              type="text"
              placeholder="Ketik pertanyaan kuis di sini..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="form-input"
            />
            <button type="submit" className="btn-add-q">Tambah</button>
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

                    {/* Hidden Answer Key & Discussion Box (For AI Questions) */}
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
                            <strong>Kunci Jawaban & Pembahasan AI:</strong>
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
            <div className="input-score-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#1e40af', fontSize: '13px' }}>
                  Penilaian Bintang Kuis untuk Soal #{expandedQuestionIndex + 1}:
                </strong> 
                <span style={{ fontSize: '13px', color: '#1e3a8a', marginLeft: '4px' }}>
                  "{typeof questions[expandedQuestionIndex] === 'object' ? questions[expandedQuestionIndex].text : questions[expandedQuestionIndex]}"
                </span>
              </div>
              <button 
                onClick={() => handleSaveAllScores(expandedQuestionIndex)}
                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>star</span>
                Simpan Bintang Kuis
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">Memuat siswa...</div>
          ) : (
            <div className="student-scoring-table-wrapper" style={{ position: 'relative' }}>
              <table className="scoring-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Siswa</th>
                    <th>NIS</th>
                    <th>Penilaian Bintang Kuis (1 - 5 Bintang)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st, i) => {
                    const currentScore = Number(studentScores[st._id]) || 0;
                    let currentStars = 0;
                    if (currentScore >= 100) currentStars = 5;
                    else if (currentScore >= 80) currentStars = 4;
                    else if (currentScore >= 60) currentStars = 3;
                    else if (currentScore >= 40) currentStars = 2;
                    else if (currentScore >= 20) currentStars = 1;

                    return (
                      <tr key={st._id}>
                        <td>{i + 1}</td>
                        <td><strong>{st.full_name}</strong></td>
                        <td>{st.nis || '-'}</td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((starNum) => {
                              const isFilled = starNum <= currentStars;
                              return (
                                <span
                                  key={starNum}
                                  className="material-symbols-outlined"
                                  onClick={() => handleScoreChange(st._id, starNum * 20)}
                                  style={{
                                    fontSize: '24px',
                                    color: isFilled ? '#f59e0b' : '#cbd5e1',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                  title={`Beri ${starNum} Bintang (${starNum * 20} Poin)`}
                                >
                                  {isFilled ? 'star' : 'star_outline'}
                                </span>
                              );
                            })}
                            <span style={{ fontSize: '12px', fontWeight: '800', color: currentStars > 0 ? '#d97706' : '#94a3b8', marginLeft: '8px' }}>
                              {currentStars > 0 ? `${currentStars} Bintang` : 'Pilih Bintang'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {expandedQuestionIndex !== null && (
                <div 
                  className="save-score-footer"
                  style={{ 
                    position: 'sticky', 
                    bottom: 0, 
                    background: '#ffffff', 
                    padding: '14px 20px', 
                    borderTop: '2px solid #cbd5e1', 
                    zIndex: 20, 
                    display: 'flex', 
                    justify: 'space-between', 
                    alignItems: 'center',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
                    borderRadius: '0 0 12px 12px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    {Object.keys(studentScores).length > 0 
                      ? `${Object.keys(studentScores).length} Siswa Berhasil Diberi Bintang` 
                      : 'Klik bintang di atas untuk menilai siswa'}
                  </span>
                  <button
                    className="btn-save-all-scores"
                    onClick={() => handleSaveAllScores(expandedQuestionIndex)}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>star</span>
                    Simpan Seluruh Bintang Kuis ke Progress Siswa
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
