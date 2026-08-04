import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [activeTab, setActiveTab] = useState('master');
  const [masterQuizzes, setMasterQuizzes] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherMaterials, setTeacherMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Create Master Quiz Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [questions, setQuestions] = useState([
    { question_text: '', answer: '', options: ['A', 'B', 'C', 'D'], correct_option: 0, points: 10 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // State untuk preview materi
  const [previewMaterialModal, setPreviewMaterialModal] = useState(null);

  // Distribute Modal State
  const [distributeModal, setDistributeModal] = useState(null);
  const [targetClassForDistribute, setTargetClassForDistribute] = useState('');
  const [distributing, setDistributing] = useState(false);

  // Submissions Modal State
  const [viewSubmissionModal, setViewSubmissionModal] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);

  // Live Quiz & Scoring State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentScores, setStudentScores] = useState({});
  const [studentStars, setStudentStars] = useState({});
  const [showAnswerMap, setShowAnswerMap] = useState({});

  useEffect(() => {
    fetchMasterQuizzes();
    fetchAllQuizzes();
    fetchStudents();
    fetchTeacherProfile();
    fetchTeacherMaterials();
  }, []);

  // 🔥 FETCH MASTER QUIZZES - sudah difilter di backend
  const fetchMasterQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quiz/master');
      setMasterQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Error fetching master quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FETCH ALL QUIZZES - sudah difilter di backend
  const fetchAllQuizzes = async () => {
    try {
      const res = await api.get('/quiz');
      setAllQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Error fetching all quizzes:', err);
    }
  };

  const fetchTeacherMaterials = async () => {
    try {
      const res = await api.get('/materials/guru/me');
      setTeacherMaterials(res.data.data || res.data.materials || []);
    } catch (err) {
      console.error('Error fetching teacher materials:', err);
    }
  };

  const fetchTeacherProfile = async () => {
    try {
      const [profRes, subRes, classRes] = await Promise.allSettled([
        api.get('/profile'),
        api.get('/subjects'),
        api.get('/classes')
      ]);

      const rawTeacherSubjects = profRes.status === 'fulfilled' ? profRes.value.data?.subjects || [] : [];
      const allMasterSubjects = subRes.status === 'fulfilled' ? subRes.value.data?.data || [] : [];
      const allMasterClasses = classRes.status === 'fulfilled' ? classRes.value.data?.data || [] : [];

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
      if (uniqueNames.length > 0) setSelectedSubject(uniqueNames[0]);

      if (allMasterClasses.length > 0) {
        setClasses(allMasterClasses);
        const firstClassName = allMasterClasses[0]?.name || allMasterClasses[0]?.class_name;
        if (firstClassName) setSelectedClass(firstClassName);
        if (firstClassName) setTargetClassForDistribute(firstClassName);
      }
    } catch (err) {
      console.error('Failed to fetch teacher profile/subjects', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users/students/all');
      const data = response.data.data || [];
      setStudents(data);

      const classList = [...new Set(data.map(s => {
        if (!s) return null;
        if (typeof s.class_id === 'object' && s.class_id?.name) return s.class_id.name;
        return s.class_name || (typeof s.class_id === 'string' ? s.class_id : null);
      }).filter(Boolean))];

      if (classList.length > 0 && classes.length === 0) {
        setClasses(classList.map(c => ({ name: c, id: c })));
        if (!selectedClass) setSelectedClass(classList[0]);
        if (!targetClassForDistribute) setTargetClassForDistribute(classList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const getStudentClassStr = (st) => {
    if (!st) return '';
    if (typeof st.class_id === 'object' && st.class_id?.name) return st.class_id.name;
    return st.class_name || (typeof st.class_id === 'string' ? st.class_id : '');
  };

  const getFilteredStudentsForClass = () => {
    if (!students || students.length === 0) return [];
    if (!selectedClass) return students;

    const targetNorm = selectedClass.toLowerCase().replace(/kelas\s*/gi, '').trim();
    const filtered = students.filter(st => {
      const stClassNorm = getStudentClassStr(st).toLowerCase().replace(/kelas\s*/gi, '').trim();
      return stClassNorm === targetNorm || stClassNorm.includes(targetNorm) || targetNorm.includes(stClassNorm);
    });

    return filtered.length > 0 ? filtered : students;
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/quiz/generate-ai', {
        topic: quizTitle || 'Topik Pembelajaran',
        subject_name: selectedSubject || 'Informatika',
        material_id: selectedMaterialId || undefined,
        num_questions: 5
      });

      if (res.data && res.data.success) {
        const generated = res.data.questions || [];
        setQuestions(prev => [...prev.filter(q => q.question_text.trim() !== ''), ...generated]);
        alert(`Berhasil membuat ${generated.length} pertanyaan kuis unik via AI dari sumber materi!`);
      }
    } catch (err) {
      console.error('Failed to generate AI quiz', err);
      alert('Gagal membuat kuis AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMasterQuiz = async (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      alert('Judul Paket Quiz wajib diisi.');
      return;
    }
    setSavingQuiz(true);
    try {
      await api.post('/quiz/master', {
        title: quizTitle,
        description: quizDesc,
        subject_name: selectedSubject || 'Informatika',
        is_master: true,
        questions
      });
      alert(`Paket Master Quiz "${quizTitle}" berhasil disimpan ke Bank Quiz!`);
      setShowCreateModal(false);
      setQuizTitle('');
      setQuizDesc('');
      setSelectedMaterialId('');
      setQuestions([{ question_text: '', answer: '', options: ['A', 'B', 'C', 'D'], correct_option: 0, points: 10 }]);
      fetchMasterQuizzes();
    } catch (err) {
      console.error('Error saving quiz:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan Paket Quiz.');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteMasterQuiz = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus Paket Quiz ini?')) return;
    try {
      await api.delete(`/quiz/${id}`);
      alert('Paket Quiz berhasil dihapus.');
      fetchMasterQuizzes();
      fetchAllQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert('Gagal menghapus Paket Quiz.');
    }
  };

  const handlePublishQuizToClassSession = async () => {
    if (!distributeModal || !distributeModal.targetQuiz) return;
    setDistributing(true);
    try {
      const targetClass = targetClassForDistribute || (classes[0]?.name || classes[0]?._id || '8B');
      await api.post('/quiz/distribute', {
        master_quiz_id: distributeModal.targetQuiz._id,
        class_id: targetClass,
        session_number: 1
      });
      alert(`Berhasil mendistribusikan Live Quiz "${distributeModal.targetQuiz.title}" ke Kelas ${targetClass}!`);
      setDistributeModal(null);
      fetchMasterQuizzes();
      fetchAllQuizzes();
    } catch (err) {
      console.error('Error distributing quiz:', err);
      alert(err.response?.data?.message || 'Gagal mendistribusikan Live Quiz.');
    } finally {
      setDistributing(false);
    }
  };

  const handleOpenSubmissionsModal = async (quiz) => {
    setViewSubmissionModal({ quiz, submissions: [] });
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/quiz/${quiz._id}/submissions`);
      setViewSubmissionModal({ quiz, submissions: res.data.submissions || [] });
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSetStudentStar = (stId, starNum) => {
    setStudentStars(prev => ({ ...prev, [stId]: starNum }));
    setStudentScores(prev => ({ ...prev, [stId]: starNum * 20 }));
  };

  const handleSaveAllScores = async () => {
    const scoresToSubmit = Object.entries(studentScores).filter(([_, score]) => score !== '');
    if (scoresToSubmit.length === 0) {
      alert('Tidak ada nilai kuis atau bintang baru yang dimasukkan.');
      return;
    }

    let successCount = 0;
    try {
      await Promise.all(
        scoresToSubmit.map(async ([studentId, score]) => {
          const starsEarned = studentStars[studentId] || Math.min(5, Math.ceil(Number(score) / 20));
          await api.post('/grades', {
            student: studentId,
            score: Number(score),
            type: 'quiz',
            note: `Quiz Live: ${selectedSubject || 'Informatika'} (${starsEarned} Bintang ⭐)`
          });
          successCount++;
        })
      );
      alert(`Berhasil menyimpan ${successCount} nilai kuis ke Progress Siswa!`);
      setStudentScores({});
      setStudentStars({});
    } catch (err) {
      console.error('Failed to submit scores:', err);
      alert('Gagal menyimpan beberapa nilai kuis.');
    }
  };

  const toggleShowAnswer = (idx) => {
    setShowAnswerMap(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderStars = (rating) => {
    const stars = [];
    const count = Number(rating) || 1;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className="material-symbols-outlined" style={{ fontSize: '18px', color: i <= count ? '#f59e0b' : '#cbd5e1', verticalAlign: 'middle' }}>
          {i <= count ? 'star' : 'star_border'}
        </span>
      );
    }
    return stars;
  };

  // Preview Material Handler
  const handlePreviewMaterial = (material) => {
    setPreviewMaterialModal(material);
  };

  // 🔥 Filter published quizzes - sudah difilter di backend, tapi filter tambahan untuk kelas
  const publishedQuizzes = allQuizzes.filter(q => !q.is_master);

  const publishedQuizzesForClass = publishedQuizzes.filter(q => {
    if (!selectedClass) return true;
    const targetNorm = selectedClass.toLowerCase().replace(/kelas\s*/gi, '').trim();
    const qClassNorm = (q.class_name || '').toLowerCase().replace(/kelas\s*/gi, '').trim();
    return qClassNorm === targetNorm || qClassNorm.includes(targetNorm) || targetNorm.includes(qClassNorm);
  });

  const activeLiveQuiz = publishedQuizzesForClass.find(q => q._id === selectedQuizId) || publishedQuizzesForClass[0];

  const filteredStudentsList = getFilteredStudentsForClass();

  // 🔥 Jika loading, tampilkan indikator
  if (loading && masterQuizzes.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#0284c7', fontWeight: '800' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        Memuat data quiz guru...
      </div>
    );
  }

  return (
    <div className="guru-quiz-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Manajemen Bank Live Quiz & Master Quiz
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Buat kuis dari materi yang pernah dibuat, sematkan ke sesi kelas, dan lihat jawaban siswa serta bintang yang diperoleh.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined">add</span> Buat Paket Master Quiz Baru
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('master')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'master' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'master' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">quiz</span> Bank Master Quiz ({masterQuizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('published')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'published' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'published' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">rule</span> 📋 Kuis Terbit & Jawaban Siswa ({publishedQuizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'live' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'live' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">speed</span> ⚡ Mode Live Quiz & Input Nilai
        </button>
      </div>

      {/* ============================================================
          TAB 1: BANK MASTER QUIZ
          ============================================================ */}
      {activeTab === 'master' && (
        <div>
          {masterQuizzes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {masterQuizzes.map((qz) => (
                <div key={qz._id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px' }}>
                        {qz.subject_name || 'Informatika'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                        {qz.questions?.length || 0} Pertanyaan
                      </span>
                    </div>
                    <h3 
                      onClick={() => setSelectedQuizDetail(qz)}
                      style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7', margin: '0 0 6px 0', cursor: 'pointer', textDecoration: 'underline' }}
                      title="Klik untuk melihat isi soal"
                    >
                      {qz.title}
                    </h3>
                    {qz.description && (
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>{qz.description}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '14px' }}>
                    <button
                      onClick={() => setDistributeModal({ targetQuiz: qz })}
                      style={{ flex: 1, background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>publish</span> Distribusikan Kuis
                    </button>
                    <button
                      onClick={() => handleDeleteMasterQuiz(qz._id)}
                      style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '40px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>quiz</span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '10px 0 4px 0' }}>Bank Master Quiz Kosong</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Buat paket kuis baru dari materi yang pernah dibuat atau gunakan AI Generator.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                + Buat Paket Master Quiz Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: KUIS TERBIT & JAWABAN SISWA
          ============================================================ */}
      {activeTab === 'published' && (
        <div>
          {publishedQuizzes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {publishedQuizzes.map((qz) => (
                <div key={qz._id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: '6px' }}>
                        Kelas {qz.class_name || '8B'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#f0f9ff', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                        Terbit & Aktif
                      </span>
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{qz.title}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
                      Mapel: {qz.subject_name || 'Informatika'} | {qz.questions?.length || 0} Pertanyaan Kuis
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px' }}>
                    <button
                      onClick={() => handleOpenSubmissionsModal(qz)}
                      style={{ flex: 1, background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>analytics</span> 📊 Lihat Jawaban & Siswa
                    </button>
                    <button
                      onClick={() => handleDeleteMasterQuiz(qz._id)}
                      style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '40px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>publish</span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '10px 0 4px 0' }}>Belum Ada Kuis yang Diterbitkan</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Buka tab "Bank Master Quiz" lalu klik tombol "Sematkan ke Sesi" untuk menerbitkan kuis ke kelas.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: MODE LIVE QUIZ & INPUT NILAI
          ============================================================ */}
      {activeTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>PILIH KELAS TARGET:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}
                >
                  {classes.map((c, idx) => (
                    <option key={idx} value={c.name || c}>{c.name || c}</option>
                  ))}
                  {!classes.length && <option value="8B">Kelas 8B</option>}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>KUIS TERBIT (DIRECTED):</label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', maxWidth: '240px' }}
                >
                  {publishedQuizzesForClass.length > 0 ? (
                    publishedQuizzesForClass.map(q => (
                      <option key={q._id} value={q._id}>{q.title} (Sesi ke-{q.session_number || 1})</option>
                    ))
                  ) : (
                    <option value="">-- Belum Ada Kuis Terbit untuk {selectedClass} --</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>CARI SISWA:</label>
                <input
                  type="text"
                  placeholder="Ketik nama atau NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', width: '180px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveAllScores}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined">save</span> 💾 Simpan Nilai Kuis ke Progress Siswa
            </button>
          </div>

          {publishedQuizzesForClass.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '40px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>quiz</span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '10px 0 4px 0' }}>
                Belum Ada Live Quiz yang Diterbitkan ke Kelas {selectedClass}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                Soal kuis belum disematkan (directed). Buka tab <strong>"Bank Master Quiz"</strong> lalu klik <strong>"Sematkan ke Sesi"</strong> untuk menerbitkan kuis ke kelas ini.
              </p>
              <button
                onClick={() => setActiveTab('master')}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                Buka Bank Master Quiz
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.5fr)', gap: '20px' }}>
              
              {/* LEFT COLUMN: SOAL KUIS */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>format_list_bulleted</span>
                  Pertanyaan Live Quiz ({activeLiveQuiz?.title})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '14px' }}>
                  Target Kelas: <strong>{activeLiveQuiz?.class_name || selectedClass}</strong> | Sesi ke-{activeLiveQuiz?.session_number || 1}
                </span>

                {(activeLiveQuiz?.questions || []).map((q, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0284c7' }}>Soal #{idx + 1}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>10 Poin</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '700' }}>
                      {q.question_text || q.text}
                    </p>

                    {q.answer && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => toggleShowAnswer(idx)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            {showAnswerMap[idx] ? 'visibility_off' : 'visibility'}
                          </span>
                          {showAnswerMap[idx] ? 'Sembunyikan Kunci Jawaban' : 'Tampilkan Kunci Jawaban'}
                        </button>

                        {showAnswerMap[idx] && (
                          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#0369a1', marginTop: '6px' }}>
                            <strong>Kunci Jawaban:</strong> {q.answer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* RIGHT COLUMN: TABEL SISWA */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>person</span>
                    Input Bintang & Nilai Kuis Siswa ({selectedClass || 'Kelas 8B'})
                  </h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1' }}>No</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1' }}>Nama Siswa</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1' }}>Bintang ⭐</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1', width: '100px' }}>Nilai (0-100)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentsList.length > 0 ? (
                        filteredStudentsList
                          .filter(s => !searchQuery || s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((st, idx) => (
                            <tr key={st._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a' }}>{st.full_name || st.name}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  {[1, 2, 3, 4, 5].map(starNum => (
                                    <button
                                      key={starNum}
                                      type="button"
                                      onClick={() => handleSetStudentStar(st._id, starNum)}
                                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}
                                      title={`Beri ${starNum} Bintang (${starNum * 20} Poin)`}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: (studentStars[st._id] || 0) >= starNum ? '#f59e0b' : '#cbd5e1' }}>
                                        {(studentStars[st._id] || 0) >= starNum ? 'star' : 'star_border'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="0"
                                  value={studentScores[st._id] !== undefined ? studentScores[st._id] : ''}
                                  onChange={(e) => setStudentScores({ ...studentScores, [st._id]: e.target.value })}
                                  style={{ width: '75px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '800', textAlign: 'center', color: '#0284c7' }}
                                />
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            Belum ada data siswa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PREVIEW MATERI MODAL
          ============================================================ */}
      {previewMaterialModal && (
        <div className="modal-overlay" onClick={() => setPreviewMaterialModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '750px', width: '92%', maxHeight: '88vh', borderRadius: '20px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '24px' }}>description</span>
                Preview Materi: {previewMaterialModal.title}
              </h3>
              <button onClick={() => setPreviewMaterialModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#64748b' }}>close</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {previewMaterialModal.description && (
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Deskripsi & Petunjuk:</strong>
                  {previewMaterialModal.description}
                </div>
              )}

              {previewMaterialModal.content && (
                <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.7', marginBottom: '16px', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }} dangerouslySetInnerHTML={{ __html: previewMaterialModal.content }} />
              )}

              {previewMaterialModal.file_url ? (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '14px', overflow: 'hidden', minHeight: '300px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  {previewMaterialModal.file_url.endsWith('.pdf') ? (
                    <iframe src={previewMaterialModal.file_url} title="Preview File PDF" style={{ width: '100%', height: '450px', border: 'none' }} />
                  ) : previewMaterialModal.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={previewMaterialModal.file_url} alt="Preview Materi" style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '10px' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#0284c7' }}>file_present</span>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '10px 0 4px 0' }}>
                        {previewMaterialModal.file_name || 'Dokumen Materi'}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Berkas ini siap diakses atau diunduh.</p>
                      <a href={previewMaterialModal.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span> Unduh / Buka
                      </a>
                    </div>
                  )}
                </div>
              ) : previewMaterialModal.external_link ? (
                <div style={{ padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
                  <strong style={{ fontSize: '13px', color: '#0369a1', display: 'block', marginBottom: '6px' }}>Tautan Eksternal:</strong>
                  <a href={previewMaterialModal.external_link} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontSize: '13px', fontWeight: '700', wordBreak: 'break-all' }}>{previewMaterialModal.external_link}</a>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>menu_book</span>
                  <p style={{ fontSize: '14px', fontWeight: '700', margin: '8px 0 0 0' }}>Materi ini berisi ringkasan judul & petunjuk.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              {previewMaterialModal.file_url && (
                <a href={previewMaterialModal.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#ffffff', textDecoration: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span> Buka di Tab Baru
                </a>
              )}
              <button onClick={() => setPreviewMaterialModal(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CREATE MASTER QUIZ MODAL
          ============================================================ */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '650px', width: '92%', maxHeight: '88vh', borderRadius: '20px', padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>quiz</span>
                Buat Paket Master Quiz Baru
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMasterQuiz}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Judul Paket Quiz *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kuis Pemrograman Java Dasar"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              {/* MATERIAL SOURCE SELECTOR - dengan tombol Preview */}
              <div style={{ marginBottom: '14px', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>library_books</span>
                  Sumber Dari Materi yang Pernah Guru Buat (Opsional)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    style={{ flex: 1, minWidth: '150px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', background: '#ffffff' }}
                  >
                    <option value="">-- Tanpa Sumber Materi (Manual) --</option>
                    {teacherMaterials.map(m => (
                      <option key={m._id} value={m._id}>{m.title} ({m.file_name || 'Dokumen Materi'})</option>
                    ))}
                  </select>

                  {/* Tombol Preview Materi */}
                  {selectedMaterialId && (
                    <button
                      type="button"
                      onClick={() => {
                        const selected = teacherMaterials.find(m => m._id === selectedMaterialId);
                        if (selected) handlePreviewMaterial(selected);
                      }}
                      style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                      Lihat Materi
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                    {isGenerating ? 'AI Generasi...' : 'Generate Quiz AI'}
                  </button>
                </div>

                {/* Info materi yang dipilih */}
                {selectedMaterialId && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#0369a1' }}>
                    📄 Materi terpilih: <strong>{teacherMaterials.find(m => m._id === selectedMaterialId)?.title}</strong>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Mata Pelajaran</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                >
                  {subjects.map((sub, idx) => (
                    <option key={idx} value={typeof sub === 'object' ? sub.name : sub}>
                      {typeof sub === 'object' ? sub.name : sub}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Deskripsi / Petunjuk</label>
                <textarea
                  rows="2"
                  placeholder="Keterangan kuis singkat..."
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Daftar Soal Kuis ({questions.length})</strong>
                  <button
                    type="button"
                    onClick={() => setQuestions(prev => [...prev, { question_text: '', answer: '', options: ['A', 'B', 'C', 'D'], correct_option: 0, points: 10 }])}
                    style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    + Tambah Soal
                  </button>
                </div>

                {questions.map((q, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7' }}>Soal #{idx + 1}</span>
                      {questions.length > 1 && (
                        <button type="button" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>Hapus</button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Tuliskan teks pertanyaan kuis #${idx + 1}...`}
                      value={q.question_text || q.text || ''}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].question_text = e.target.value;
                        setQuestions(updated);
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', marginBottom: '6px' }}
                    />
                    <input
                      type="text"
                      placeholder="Kunci Jawaban / Penjelasan Singkat"
                      value={q.answer || ''}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].answer = e.target.value;
                        setQuestions(updated);
                      }}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={savingQuiz} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  {savingQuiz ? 'Menyimpan...' : 'Simpan ke Bank Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          POPUP DISTRIBUTE QUIZ
          ============================================================ */}
      {distributeModal && (
        <div className="modal-overlay" onClick={() => setDistributeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '520px', width: '90%', borderRadius: '20px', padding: '24px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>publish</span>
                Distribusikan Live Quiz ke Kelas
              </h3>
              <button onClick={() => setDistributeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>{distributeModal.targetQuiz.title}</strong>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Pilih target kelas untuk mendistribusikan kuis ini.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Target Kelas *</label>
              <select
                value={targetClassForDistribute}
                onChange={(e) => setTargetClassForDistribute(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
              >
                {classes.map(c => (
                  <option key={c._id || c.id || c.name} value={c.name || c._id || c.id}>{c.name || c.class_name}</option>
                ))}
                {!classes.length && (
                  <>
                    <option value="8B">Kelas 8B</option>
                    <option value="8C">Kelas 8C</option>
                    <option value="8D">Kelas 8D</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDistributeModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
              <button
                onClick={handlePublishQuizToClassSession}
                disabled={distributing}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                {distributing ? 'Mendistribusikan...' : 'Distribusikan Kuis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW SUBMISSIONS MODAL
          ============================================================ */}
      {viewSubmissionModal && (
        <div className="modal-overlay" onClick={() => setViewSubmissionModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '720px', width: '92%', maxHeight: '88vh', borderRadius: '20px', padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  📊 Rekap Jawaban & Perolehan Bintang Siswa
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Kuis: <strong>{viewSubmissionModal.quiz?.title}</strong> | Kelas {viewSubmissionModal.quiz?.class_name} Sesi ke-{viewSubmissionModal.quiz?.session_number}
                </span>
              </div>
              <button onClick={() => setViewSubmissionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px', marginBottom: '18px' }}>
              <strong style={{ fontSize: '13px', color: '#0284c7', display: 'block', marginBottom: '8px' }}>
                Daftar Pertanyaan Kuis ({viewSubmissionModal.quiz?.questions?.length || 0} Soal):
              </strong>
              {(viewSubmissionModal.quiz?.questions || []).map((q, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                  <strong>{idx + 1}.</strong> {q.question_text || q.text} {q.answer && <em style={{ color: '#0284c7' }}>(Kunci: {q.answer})</em>}
                </div>
              ))}
            </div>

            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
              Rekap Siswa yang Sudah Menjawab ({viewSubmissionModal.submissions?.length || 0} Siswa):
            </strong>

            {loadingSubmissions ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat data jawaban siswa...</div>
            ) : viewSubmissionModal.submissions?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>No</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Nama Siswa</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>NISN / NIS</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Apresiasi Bintang ⭐</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Waktu Kumpul</th>
                  </tr>
                </thead>
                <tbody>
                  {viewSubmissionModal.submissions.map((sub, idx) => (
                    <tr key={sub._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '800', color: '#0f172a' }}>{sub.student_name}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{sub.nisn || sub.nis || '-'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {renderStars(sub.star_rating || 5)}
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b', marginLeft: '6px' }}>({sub.star_rating || 5} Bintang ⭐)</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {new Date(sub.submitted_at || sub.createdAt || Date.now()).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                Belum ada siswa yang menjawab kuis ini.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button onClick={() => setViewSubmissionModal(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '700' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PREVIEW DETAIL KUIS */}
      {selectedQuizDetail && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{selectedQuizDetail.title}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Mapel: <strong style={{ color: '#0284c7' }}>{selectedQuizDetail.subject_name || 'Informatika'}</strong> | Tingkat Kelas: <strong>{selectedQuizDetail.grade_level || '8'}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedQuizDetail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {selectedQuizDetail.questions && selectedQuizDetail.questions.length > 0 ? (
                selectedQuizDetail.questions.map((q, qIdx) => (
                  <div key={q._id || qIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0284c7', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                        {qIdx + 1}
                      </span>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.5' }}>{q.question_text}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px', paddingLeft: '36px' }}>
                      {q.options && q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correct_option;
                        return (
                          <div 
                            key={oIdx} 
                            style={{ 
                              padding: '10px 14px', 
                              borderRadius: '10px', 
                              border: isCorrect ? '2px solid #10b981' : '1px solid #cbd5e1', 
                              background: isCorrect ? '#ecfdf5' : '#ffffff',
                              fontSize: '13px',
                              color: isCorrect ? '#065f46' : '#1e293b',
                              fontWeight: isCorrect ? '700' : '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span style={{ 
                              background: isCorrect ? '#10b981' : '#f1f5f9', 
                              color: isCorrect ? '#ffffff' : '#64748b',
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '50%', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Tidak ada soal di dalam kuis ini.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                onClick={() => setSelectedQuizDetail(null)}
                style={{ padding: '10px 24px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruQuiz;