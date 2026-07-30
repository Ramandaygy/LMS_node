import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-cbt.css';

const SiswaCbt = () => {
  const [activeMainTab, setActiveMainTab] = useState('cbt'); // 'cbt' | 'quiz'

  // CBT State
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Exam Session State (CBT)
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Result & Review State (CBT)
  const [examResult, setExamResult] = useState(null);
  const [reviewExam, setReviewExam] = useState(null);

  // Live Quiz State (Siswa)
  const [studentQuizzes, setStudentQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null); // Full quiz object for attempting
  const [quizAnswers, setQuizAnswers] = useState({}); // { 0: 1, 1: 0 }
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null); // { score, star_rating }
  const [quizLeaderboardModal, setQuizLeaderboardModal] = useState(null); // { quiz, submissions: [] }

  useEffect(() => {
    fetchExams();
    fetchStudentQuizzes();
  }, []);

  // Timer Countdown Effect for CBT
  useEffect(() => {
    let timer = null;
    if (activeExam && !examResult && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            autoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeExam, examResult, timeLeftSeconds]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cbt/exams');
      if (res.data.success) {
        setExams(res.data.exams || []);
      }
    } catch (err) {
      console.error('Error fetching CBT exams:', err);
      setError('Gagal memuat daftar ujian CBT.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentQuizzes = async () => {
    try {
      const res = await api.get('/quiz');
      const all = res.data.quizzes || [];
      setStudentQuizzes(all.filter(q => !q.is_master));
    } catch (err) {
      console.error('Error fetching student quizzes:', err);
    }
  };

  const handleStartExam = async (examId) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/cbt/exams/${examId}`);
      if (res.data.success) {
        if (res.data.is_completed) {
          setReviewExam(res.data.exam);
          setExamResult(res.data.result);
          setActiveExam(null);
        } else {
          const examData = res.data.exam;
          setActiveExam(examData);
          setReviewExam(null);
          setExamResult(null);
          setCurrentQuestionIdx(0);
          setUserAnswers({});
          setTimeLeftSeconds((examData.duration_minutes || 30) * 60);
        }
      }
    } catch (err) {
      console.error('Error starting CBT exam:', err);
      setError('Gagal memulai ujian CBT. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx, optionIdx) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: {
        selected: optionIdx,
        flagged: prev[qIdx]?.flagged || false,
      },
    }));
  };

  const handleToggleFlag = (qIdx) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: {
        selected: prev[qIdx]?.selected !== undefined ? prev[qIdx].selected : null,
        flagged: !prev[qIdx]?.flagged,
      },
    }));
  };

  const autoSubmitExam = () => {
    handleSubmitExam(true);
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(userAnswers).map(([qIdx, val]) => ({
        question_index: parseInt(qIdx),
        selected_option: val.selected,
      }));

      const res = await api.post(`/cbt/exams/${activeExam._id}/submit`, {
        answers: formattedAnswers,
        is_auto_submit: isAuto,
      });

      if (res.data.success) {
        setExamResult(res.data.result);
        setReviewExam(activeExam);
        setActiveExam(null);
        setShowConfirmModal(false);
        fetchExams();
      }
    } catch (err) {
      console.error('Error submitting CBT exam:', err);
      alert('Gagal mengumpulkan ujian. Silakan periksa koneksi internet Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // LIVE QUIZ HANDLERS
  const handleStartQuiz = (qz) => {
    setActiveQuiz(qz);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleSelectQuizOption = (qIdx, oIdx) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizSubmitting(true);
    try {
      const res = await api.post('/quiz/submit', {
        quiz_id: activeQuiz._id,
        answers: quizAnswers
      });

      if (res.data.success) {
        setQuizResult({
          score: res.data.score,
          star_rating: res.data.star_rating
        });
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert(err.response?.data?.message || 'Gagal mengumpulkan kuis.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleOpenQuizLeaderboard = async (qz) => {
    setQuizLeaderboardModal({ quiz: qz, submissions: [] });
    try {
      const res = await api.get(`/quiz/${qz._id}/submissions`);
      setQuizLeaderboardModal({ quiz: qz, submissions: res.data.submissions || [] });
    } catch (err) {
      console.error('Error fetching quiz leaderboard:', err);
    }
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !activeExam && !reviewExam) {
    return <div className="cbt-loading">Memuat Halaman Ujian & Kuis...</div>;
  }

  // ACTIVE QUIZ TAKING VIEW
  if (activeQuiz) {
    return (
      <div className="cbt-container" style={{ padding: '24px', maxWidth: '840px', margin: '0 auto' }}>
        <button
          onClick={() => { setActiveQuiz(null); setQuizResult(null); }}
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span> Kembali ke Daftar Kuis
        </button>

        {!quizResult ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e1', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: '6px' }}>
                Kuis Live Sesi ke-{activeQuiz.session_number || 1}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '6px 0 2px 0' }}>{activeQuiz.title}</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Mata Pelajaran: {activeQuiz.subject_name || 'Informatika'}</p>
            </div>

            {(activeQuiz.questions || []).map((q, idx) => (
              <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <strong style={{ fontSize: '14px', color: '#0284c7', display: 'block', marginBottom: '6px' }}>
                  Pertanyaan #{idx + 1} ({q.points || 10} Poin)
                </strong>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>
                  {q.question_text || q.text}
                </p>

                {q.options && q.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        onClick={() => handleSelectQuizOption(idx, oIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: quizAnswers[idx] === oIdx ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: quizAnswers[idx] === oIdx ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: quizAnswers[idx] === oIdx ? '800' : '500',
                          fontSize: '13px'
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${idx}`}
                          checked={quizAnswers[idx] === oIdx}
                          onChange={() => {}}
                        />
                        <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Ketik jawaban Anda..."
                    value={quizAnswers[idx] || ''}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, [idx]: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={handleSubmitQuiz}
                disabled={quizSubmitting}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined">send</span>
                {quizSubmitting ? 'Mengirimkan...' : 'Kumpulkan Kuis'}
              </button>
            </div>
          </div>
        ) : (
          /* QUIZ RESULT BANNER & STAR RATING */
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e1', padding: '32px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>workspace_premium</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Selamat! Kuis Berhasil Dikumpulkan</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>{activeQuiz.title}</p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', maxWidth: '360px', margin: '0 auto 24px auto' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>PEROLEHAN BINTANG & SKOR</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#0284c7', marginBottom: '6px' }}>
                {quizResult.score} / 100
              </div>
              <div>
                {renderStars(quizResult.star_rating)}
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', marginLeft: '6px' }}>
                  ({quizResult.star_rating} Bintang)
                </span>
              </div>
            </div>

            <button
              onClick={() => { setActiveQuiz(null); setQuizResult(null); }}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
            >
              Kembali ke Daftar Kuis
            </button>
          </div>
        )}
      </div>
    );
  }

  // MAIN DASHBOARD VIEW (CBT & QUIZ TABS)
  return (
    <div className="cbt-container">
      <div className="cbt-page-header">
        <div>
          <h1 className="page-title">Ujian CBT & Quiz Sesi Kelas</h1>
          <p className="page-subtitle">Kerjakan Ujian CBT resmi dan Live Quiz Sesi untuk mengumpulkan Bintang & Nilai Rapor.</p>
        </div>
      </div>

      {/* TAB SELECTION */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveMainTab('cbt')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeMainTab === 'cbt' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeMainTab === 'cbt' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">computer</span> Ujian CBT ({exams.length})
        </button>
        <button
          onClick={() => setActiveMainTab('quiz')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeMainTab === 'quiz' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeMainTab === 'quiz' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">star</span> Live Quiz Sesi & Bintang ⭐ ({studentQuizzes.length})
        </button>
      </div>

      {/* TAB 1: UJIAN CBT */}
      {activeMainTab === 'cbt' && (
        <div>
          {exams.length > 0 ? (
            <div className="cbt-exams-grid">
              {exams.map((exam) => (
                <div key={exam._id} className="cbt-exam-card">
                  <div className="exam-card-header">
                    <span className="subject-badge">{exam.subject?.name || 'Mata Pelajaran'}</span>
                    {exam.has_submitted ? (
                      <span className={`status-badge ${exam.my_result?.is_passed ? 'passed' : 'failed'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Selesai (Nilai: {exam.my_score || 0})
                      </span>
                    ) : (
                      <span className="status-badge active">Siap Dikerjakan</span>
                    )}
                  </div>

                  <h3 className="exam-card-title">{exam.title}</h3>
                  <p className="exam-teacher">Guru Pengampu: {exam.teacher?.full_name || '-'}</p>

                  <div className="exam-meta-details">
                    <div className="meta-item">
                      <span className="material-symbols-outlined">help</span>
                      <span>{exam.total_questions || 0} Soal</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-symbols-outlined">schedule</span>
                      <span>{exam.duration_minutes || 30} Menit</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-symbols-outlined">grade</span>
                      <span>KKM: {exam.pass_score || 75}</span>
                    </div>
                  </div>

                  <div className="exam-card-actions">
                    <button className="cbt-btn-card start" onClick={() => handleStartExam(exam._id)}>
                      <span className="material-symbols-outlined">play_arrow</span>
                      {exam.has_submitted ? 'Lihat Hasil & Pembahasan' : 'Mulai Ujian CBT'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cbt-empty-state">
              <span className="material-symbols-outlined empty-icon">quiz</span>
              <h3>Belum Ada Paket Ujian CBT</h3>
              <p>Belum ada ujian CBT yang diterbitkan untuk kelas Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE QUIZ SESI & BINTANG */}
      {activeMainTab === 'quiz' && (
        <div>
          {studentQuizzes.length > 0 ? (
            <div className="cbt-exams-grid">
              {studentQuizzes.map((qz) => (
                <div key={qz._id} className="cbt-exam-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
                  <div className="exam-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: '6px' }}>
                      Kelas {qz.class_name || '8B'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#f0f9ff', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      Sesi ke-{qz.session_number || 1}
                    </span>
                  </div>

                  <h3 className="exam-card-title" style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{qz.title}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
                    Mata Pelajaran: {qz.subject_name || 'Informatika'} | {qz.questions?.length || 0} Pertanyaan
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleStartQuiz(qz)}
                      style={{ flex: 1, background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span> Kerjakan Kuis
                    </button>
                    <button
                      onClick={() => handleOpenQuizLeaderboard(qz)}
                      style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>star</span> Bintang Teman
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cbt-empty-state">
              <span className="material-symbols-outlined empty-icon">star</span>
              <h3>Belum Ada Kuis Sesi</h3>
              <p>Belum ada kuis interaktif yang disematkan guru untuk sesi pertemuan kelas Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* QUIZ LEADERBOARD & STARS MODAL FOR SISWA */}
      {quizLeaderboardModal && (
        <div className="modal-overlay" onClick={() => setQuizLeaderboardModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '600px', width: '92%', maxHeight: '85vh', borderRadius: '20px', padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  ⭐ Bintang & Peringkat Kuis Teman Sekelas
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {quizLeaderboardModal.quiz?.title} (Sesi ke-{quizLeaderboardModal.quiz?.session_number})
                </span>
              </div>
              <button onClick={() => setQuizLeaderboardModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {quizLeaderboardModal.submissions?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Peringkat</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Nama Siswa</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Nilai</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Bintang ⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {quizLeaderboardModal.submissions.map((sub, idx) => (
                    <tr key={sub._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: '800' }}>#{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0f172a' }}>{sub.student_name}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '800', color: '#0284c7' }}>{sub.total_score}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {renderStars(sub.star_rating)}
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', marginLeft: '4px' }}>({sub.star_rating})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                Belum ada siswa yang mengerjakan kuis ini.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button onClick={() => setQuizLeaderboardModal(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiswaCbt;
