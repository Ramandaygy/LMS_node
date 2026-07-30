import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [activeTab, setActiveTab] = useState('master'); // 'master' | 'live'

  const [masterQuizzes, setMasterQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Create Master Quiz Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [questions, setQuestions] = useState([
    { question_text: '', answer: '', options: ['A', 'B', 'C', 'D'], correct_option: 0, points: 10 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Distribute Modal State
  const [distributeModal, setDistributeModal] = useState(null);
  const [targetClassForDistribute, setTargetClassForDistribute] = useState('');
  const [targetSessionForDistribute, setTargetSessionForDistribute] = useState(1);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    fetchMasterQuizzes();
    fetchStudents();
    fetchTeacherProfile();
  }, []);

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
      if (allMasterClasses.length > 0) setClasses(allMasterClasses);
    } catch (err) {
      console.error('Failed to fetch teacher profile/subjects', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users/students/all');
      const data = response.data.data || [];
      setStudents(data);

      const classList = [...new Set(data.map(s => s.class_name).filter(Boolean))];
      if (classList.length > 0 && classes.length === 0) {
        setClasses(classList.map(c => ({ name: c, id: c })));
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const handleGenerateAI = async () => {
    if (!quizTitle.trim()) {
      alert('Masukkan judul topik kuis terlebih dahulu untuk AI Generator.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await api.post('/quiz/generate-ai', {
        topic: quizTitle,
        subject_name: selectedSubject || 'Informatika',
        num_questions: 5
      });

      if (res.data && res.data.success) {
        const generated = res.data.questions || [];
        setQuestions(prev => [...prev.filter(q => q.question_text.trim() !== ''), ...generated]);
        alert(`Berhasil membuat ${generated.length} pertanyaan kuis via AI!`);
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
    if (!window.confirm('Apakah Anda yakin ingin menghapus Paket Quiz ini dari Bank Quiz?')) return;
    try {
      await api.delete(`/quiz/${id}`);
      alert('Paket Master Quiz berhasil dihapus.');
      fetchMasterQuizzes();
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
        session_number: Number(targetSessionForDistribute) || 1
      });
      alert(`Berhasil menyematkan Live Quiz "${distributeModal.targetQuiz.title}" ke Kelas Sesi ke-${targetSessionForDistribute}!`);
      setDistributeModal(null);
      fetchMasterQuizzes();
    } catch (err) {
      console.error('Error distributing quiz:', err);
      alert(err.response?.data?.message || 'Gagal menyematkan Live Quiz.');
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="guru-quiz-container">
      {/* Header Bar */}
      <div className="guru-quiz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Manajemen Bank Live Quiz & Master Quiz
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Kelola Bank Master Quiz, buat kuis interaktif dengan AI Generator, dan sematkan langsung ke sesi pertemuan kelas.
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
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('master')}
          style={{
            padding: '10px 20px',
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
          onClick={() => setActiveTab('live')}
          style={{
            padding: '10px 20px',
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
          <span className="material-symbols-outlined">speed</span> Mode Live Quiz & Input Nilai
        </button>
      </div>

      {/* TAB 1: BANK MASTER QUIZ */}
      {activeTab === 'master' && (
        <div>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#0284c7', fontWeight: '800' }}>Memuat Bank Master Quiz...</div>
          ) : masterQuizzes.length > 0 ? (
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
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{qz.title}</h3>
                    {qz.description && (
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>{qz.description}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '14px' }}>
                    <button
                      onClick={() => setDistributeModal({ targetQuiz: qz })}
                      style={{ flex: 1, background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>publish</span> Sematkan ke Sesi
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
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Buat paket kuis baru secara manual atau gunakan AI Generator untuk membuat soal kuis instan.</p>
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

      {/* TAB 2: MODE LIVE QUIZ & INPUT NILAI */}
      {activeTab === 'live' && (
        <div className="quiz-layout-grid">
          <div className="quiz-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Mode Live Quiz Interaktif & Input Nilai</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Pilih kelas untuk menjalankan kuis secara live atau menginput hasil kuis siswa sekelas.</p>
          </div>
        </div>
      )}

      {/* CREATE MASTER QUIZ MODAL */}
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kuis Pemrograman Java Dasar"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                    {isGenerating ? 'AI Generasi...' : 'Generate AI'}
                  </button>
                </div>
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

      {/* POPUP DISTRIBUTE QUIZ TO CLASS & SESSION */}
      {distributeModal && (
        <div className="modal-overlay" onClick={() => setDistributeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '520px', width: '90%', borderRadius: '20px', padding: '24px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>publish</span>
                Sematkan Live Quiz ke Kelas & Sesi
              </h3>
              <button onClick={() => setDistributeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>{distributeModal.targetQuiz.title}</strong>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Pilih kelas dan sesi pertemuan untuk menyematkan kuis ini.</p>
            </div>

            <div style={{ marginBottom: '14px' }}>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Sesi Pertemuan Ke- *</label>
              <select
                value={targetSessionForDistribute}
                onChange={(e) => setTargetSessionForDistribute(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
              >
                {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>Sesi Pertemuan ke-{num}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDistributeModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
              <button
                onClick={handlePublishQuizToClassSession}
                disabled={distributing}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                {distributing ? 'Menyematkan...' : 'Sematkan Kuis ke Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruQuiz;
