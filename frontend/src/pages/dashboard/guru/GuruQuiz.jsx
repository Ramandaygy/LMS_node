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

  // Scoring Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [quizScore, setQuizScore] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        subject: selectedStudent.subject_id || 'dummy_subject_id_for_now',
        score: Number(quizScore),
        type: 'quiz',
        note: 'Icebreaker Quiz Point'
      });
      alert(`Berhasil memberikan nilai ${quizScore} ke ${selectedStudent.full_name}`);
      setShowModal(false);
      setQuizScore(10); 
    } catch (err) {
      console.error('Failed to submit score', err);
      alert('Gagal menyimpan nilai kuis');
    } finally {
      setIsSubmitting(false);
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

  const handleGenerateAI = () => {
    setIsGenerating(true);
    
    // Subject specific dummy questions
    const subjectQuestionBank = {
      "Matematika": [
        "Berapakah hasil dari 15 x 12?",
        "Sebuah segitiga memiliki alas 10 cm dan tinggi 5 cm, berapakah luasnya?",
        "Apa rumus keliling lingkaran?",
        "Jika x + 5 = 12, berapakah nilai x?",
        "Sebutkan 3 jenis bilangan prima pertama!"
      ],
      "IPA": [
        "Jelaskan secara singkat apa yang dimaksud dengan fotosintesis!",
        "Sebutkan 3 jenis hewan mamalia yang hidup di air!",
        "Apa fungsi klorofil pada tumbuhan?",
        "Sebutkan 3 wujud benda beserta contohnya!",
        "Apa yang membedakan pembuluh vena dan arteri?"
      ],
      "Bahasa Indonesia": [
        "Apa yang dimaksud dengan majas personifikasi?",
        "Buatlah satu kalimat menggunakan kata 'bersinonim'!",
        "Sebutkan unsur-unsur intrinsik dalam sebuah cerpen!",
        "Apa perbedaan antara kalimat aktif dan pasif?",
        "Sebutkan ciri-ciri teks prosedur!"
      ],
      "Bahasa Inggris": [
        "What is the past tense of the verb 'go'?",
        "Make a sentence using the word 'beautiful'!",
        "Translate to English: 'Saya sedang makan nasi.'",
        "What are the 3 forms of verb (V1, V2, V3) for 'eat'?",
        "Mention 5 names of fruits in English!"
      ],
      "IPS": [
        "Sebutkan ibu kota dari negara Australia!",
        "Siapakah proklamator kemerdekaan Indonesia?",
        "Jelaskan apa yang dimaksud dengan letak astronomis!",
        "Sebutkan 3 contoh sumber daya alam yang dapat diperbarui!",
        "Apa fungsi dari sebuah peta?"
      ],
      "default": [
        "Sebutkan konsep paling mendasar dari mata pelajaran ini!",
        "Berikan contoh penerapan ilmu ini di kehidupan sehari-hari!",
        "Siapakah tokoh yang terkenal di bidang ini?",
        "Jelaskan satu istilah penting yang sering digunakan dalam pelajaran ini!",
        "Apa tujuan utama mempelajari materi ini?"
      ]
    };

    setTimeout(() => {
      // Find matching subject or use default
      let bank = subjectQuestionBank['default'];
      if (selectedSubject) {
        const foundKey = Object.keys(subjectQuestionBank).find(key => 
          selectedSubject.toLowerCase().includes(key.toLowerCase())
        );
        if (foundKey) bank = subjectQuestionBank[foundKey];
      }

      const randomQ = bank[Math.floor(Math.random() * bank.length)];
      setQuestions([...questions, randomQ]);
      setIsGenerating(false);
    }, 1000);
  };

  const filteredStudents = students.filter(s => s.class_name === selectedClass);

  if (loading) return <div className="quiz-loading">Memuat data kuis...</div>;

  return (
    <div className="quiz-page-container">
      <div className="quiz-header-global">
        <h2>💡 Quiz Live</h2>
        <p>Buat pertanyaan kuis dan nilai siswa secara langsung</p>
      </div>

      <div className="quiz-split-layout">
        
        {/* LEFT COLUMN: QUIZ QUESTIONS */}
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
                <div key={index} className="question-card">
                  <div className="q-number">{index + 1}</div>
                  <div className="q-text">{q}</div>
                  <button className="btn-del-q" onClick={() => handleDeleteQuestion(index)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STUDENT SIDEBAR */}
        <div className="quiz-sidebar-panel">
          <div className="sidebar-header">
            <h3>Daftar Siswa</h3>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="student-list-vertical">
            {filteredStudents.length === 0 ? (
              <div className="no-students">Tidak ada siswa di kelas ini.</div>
            ) : (
              filteredStudents.map(student => (
                <div key={student._id} className="student-list-item" onClick={() => handleStudentClick(student)}>
                  <div className="student-avatar-small">
                    {student.full_name.charAt(0)}
                  </div>
                  <div className="student-info-small">
                    <h4>{student.full_name}</h4>
                    <p>{student.nis || '-'}</p>
                  </div>
                  <div className="action-indicator">
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* SCORING MODAL */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Beri Nilai Kuis</h3>
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
