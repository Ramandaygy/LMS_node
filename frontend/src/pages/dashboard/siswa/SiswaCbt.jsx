import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-cbt.css';

const SiswaCbt = () => {
  const [activeMainTab, setActiveMainTab] = useState('active_exams'); // 'active_exams' | 'history'

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

  useEffect(() => {
    fetchExams(true);
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

  const fetchExams = async (showFullLoader = false) => {
    try {
      if (showFullLoader) setLoading(true);
      const res = await api.get('/cbt/exams');
      if (res.data.success) {
        setExams(res.data.exams || []);
      }
    } catch (err) {
      console.error('Error fetching CBT exams:', err);
      setError('Gagal memuat daftar ujian CBT.');
    } finally {
      if (showFullLoader) setLoading(false);
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
        is_flagged: val.flagged
      }));

      const totalTimeSeconds = (activeExam.duration_minutes || 30) * 60;
      const timeSpent = Math.max(0, totalTimeSeconds - timeLeftSeconds);

      const res = await api.post('/cbt/submit', {
        examId: activeExam._id,
        userAnswers: formattedAnswers,
        timeSpentSeconds: timeSpent,
      });

      if (res.data.success) {
        setExamResult(res.data.result);
        const reviewRes = await api.get(`/cbt/exams/${activeExam._id}`);
        if (reviewRes.data.success) {
          setReviewExam(reviewRes.data.exam);
        }
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

  const getExamScheduleStatus = (exam) => {
    if (!exam.start_time || !exam.end_time) {
      return { isAvailable: true, label: 'Siap Dikerjakan', class: 'active' };
    }
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (now < start) {
      return {
        isAvailable: false,
        label: `Mulai: ${start.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })}`,
        class: 'scheduled',
        message: `Ujian dijadwalkan pada ${start.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
      };
    }
    if (now > end) {
      return {
        isAvailable: false,
        label: 'Sudah Berakhir',
        class: 'expired',
        message: 'Batas waktu pengerjaan ujian telah berakhir.'
      };
    }
    return {
      isAvailable: true,
      label: `Aktif s/d ${end.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}`,
      class: 'active'
    };
  };

  const getQuestionStatus = (idx) => {
    const ans = userAnswers[idx];
    if (ans?.flagged) return 'flagged'; // Ragu-ragu (Yellow)
    if (ans?.selected !== undefined && ans?.selected !== null && ans?.selected !== -1) return 'answered'; // Green
    return 'unanswered';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !activeExam && !reviewExam) {
    return <div className="cbt-loading">Memuat Halaman Ujian CBT...</div>;
  }

  // =========================================================================
  // VIEW 3: RESULT & DISCUSSION (PEMBAHASAN SOAL)
  // =========================================================================
  if (examResult && reviewExam) {
    return (
      <div className="cbt-container">
        <div className="cbt-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="cbt-title-area">
            <h1>Hasil Ujian CBT: {reviewExam.title}</h1>
            <p>Mata Pelajaran: {reviewExam.subject_name || reviewExam.subject?.name || '-'} | Pengampu: {reviewExam.teacher?.full_name || '-'}</p>
          </div>
          <button className="cbt-btn-secondary" onClick={() => { setExamResult(null); setReviewExam(null); }} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '10px', color: '#0284c7', cursor: 'pointer', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined">arrow_back</span>
            Kembali ke Daftar Ujian
          </button>
        </div>

        {/* Score Summary Box */}
        <div className="cbt-result-summary-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '20px', padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div className={`score-badge-circle ${examResult.is_passed ? 'passed' : 'failed'}`} style={{ width: '130px', height: '130px', borderRadius: '50%', background: examResult.is_passed ? '#dcfce7' : '#fee2e2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', color: examResult.is_passed ? '#15803d' : '#b91c1c' }}>
              {examResult.score}
            </span>
            <span className="score-label" style={{ fontSize: '11px', fontWeight: '800', color: examResult.is_passed ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
              Nilai Akhir
            </span>
          </div>

          <div className="result-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', flex: 1 }}>
            <div className="stat-box">
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Status Kelulusan</span>
              <strong style={{ fontSize: '14px', color: examResult.is_passed ? '#15803d' : '#b91c1c' }}>
                {examResult.is_passed ? 'LULUS (Di Atas KKM)' : 'BELUM LULUS KKM'}
              </strong>
            </div>
            <div className="stat-box">
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Jawaban Benar</span>
              <strong style={{ fontSize: '14px', color: '#15803d' }}>{examResult.correct_count} Soal</strong>
            </div>
            <div className="stat-box">
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Jawaban Salah</span>
              <strong style={{ fontSize: '14px', color: '#b91c1c' }}>{examResult.wrong_count} Soal</strong>
            </div>
            <div className="stat-box">
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Waktu Pengerjaan</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{formatTime(examResult.time_spent_seconds)}</strong>
            </div>
          </div>
        </div>

        {/* Detailed Review & Discussion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>analytics</span>
          <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Review Hasil Ujian & Koreksi Jawaban</h2>
        </div>

        <div className="review-questions-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviewExam.questions.map((q, idx) => {
            const resultAns = examResult.answers.find((a) => a.question_index === idx);
            const selectedOpt = resultAns ? resultAns.selected_option : -1;
            const isCorrect = resultAns ? resultAns.is_correct : false;

            return (
              <div key={idx} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '18px', borderLeft: isCorrect ? '6px solid #16a34a' : '6px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>Soal #{idx + 1}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: isCorrect ? '#16a34a' : '#dc2626' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{isCorrect ? 'check_circle' : 'cancel'}</span>
                    {isCorrect ? 'Jawaban Benar' : 'Jawaban Salah/Kosong'}
                  </span>
                </div>

                <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>{q.question_text}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oIdx) => {
                    const isSelectedByStudent = selectedOpt === oIdx;
                    const isRightOption = q.correct_option === oIdx;

                    let bg = '#ffffff';
                    let border = '1px solid #cbd5e1';
                    let color = '#334155';

                    if (isSelectedByStudent) {
                      bg = isCorrect ? '#f0f9ff' : '#fef2f2';
                      border = isCorrect ? '2px solid #0284c7' : '2px solid #dc2626';
                      color = isCorrect ? '#0284c7' : '#dc2626';
                    }
                    if (isRightOption && !reviewExam.hide_correct_answers) {
                      bg = '#f0f9ff';
                      border = '2px solid #16a34a';
                      color = '#16a34a';
                    }

                    return (
                      <div key={oIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: bg, border: border, color: color, fontSize: '13px' }}>
                        <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isSelectedByStudent && <span style={{ fontSize: '10px', fontWeight: '800', background: isCorrect ? '#0284c7' : '#dc2626', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>Pilihan Anda</span>}
                          {isRightOption && !reviewExam.hide_correct_answers && <span style={{ fontSize: '10px', fontWeight: '800', background: '#16a34a', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>Kunci Jawaban</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {reviewExam.hide_correct_answers ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', padding: '10px', borderRadius: '8px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                    Kunci jawaban & pembahasan kuis ini dirahasiakan oleh guru.
                  </div>
                ) : (
                  q.explanation && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontSize: '12px', padding: '12px', borderRadius: '10px', marginTop: '12px' }}>
                      <strong>Pembahasan:</strong> {q.explanation}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE CBT EXAM SCREEN (REAL-TIME EXAM SESSION)
  // =========================================================================
  if (activeExam) {
    const currentQ = activeExam.questions[currentQuestionIdx];
    const currentAns = userAnswers[currentQuestionIdx] || { selected: -1, flagged: false };
    const isLastQuestion = currentQuestionIdx === activeExam.questions.length - 1;

    return (
      <div className="cbt-exam-wrapper" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{activeExam.title}</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Mata Pelajaran: {activeExam.subject_name || 'Informatika'} | KKM: {activeExam.pass_score || 75}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: timeLeftSeconds < 300 ? '#fef2f2' : '#f0f9ff', border: timeLeftSeconds < 300 ? '1px solid #fca5a5' : '1px solid #bae6fd', color: timeLeftSeconds < 300 ? '#dc2626' : '#0284c7', padding: '8px 16px', borderRadius: '10px', fontWeight: '800' }}>
            <span className="material-symbols-outlined">timer</span>
            <span>Sisa Waktu: <strong>{formatTime(timeLeftSeconds)}</strong></span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
          {/* Question Left */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7' }}>Soal Nomor {currentQuestionIdx + 1} dari {activeExam.questions.length}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: currentAns.flagged ? '#d97706' : '#64748b' }}>
                <input type="checkbox" checked={!!currentAns.flagged} onChange={() => handleToggleFlag(currentQuestionIdx)} />
                Ragu-ragu
              </label>
            </div>

            <p style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' }}>{currentQ?.question_text}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {currentQ?.options?.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(currentQuestionIdx, oIdx)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: currentAns.selected === oIdx ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: currentAns.selected === oIdx ? '#f0f9ff' : '#ffffff',
                    color: currentAns.selected === oIdx ? '#0284c7' : '#0f172a',
                    fontWeight: currentAns.selected === oIdx ? '800' : '500',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <span style={{ background: currentAns.selected === oIdx ? '#0284c7' : '#f1f5f9', color: currentAns.selected === oIdx ? '#ffffff' : '#475569', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentQuestionIdx === 0 ? 0.5 : 1 }}
              >
                <span className="material-symbols-outlined">arrow_back</span> Sebelumnya
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Selesai & Kumpulkan
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(activeExam.questions.length - 1, prev + 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Selanjutnya <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sidebar Right */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>Navigasi Nomor Soal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {activeExam.questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  const isActive = idx === currentQuestionIdx;
                  let bg = '#f1f5f9';
                  let border = '1px solid #cbd5e1';
                  let color = '#475569';

                  if (status === 'answered') {
                    bg = '#dcfce7';
                    border = '1px solid #16a34a';
                    color = '#15803d';
                  } else if (status === 'flagged') {
                    bg = '#fef3c7';
                    border = '1px solid #d97706';
                    color = '#b45309';
                  }
                  if (isActive) {
                    border = '2px solid #0284c7';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      style={{
                        padding: '8px 0',
                        borderRadius: '8px',
                        background: bg,
                        border: border,
                        color: color,
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '3px' }}></span> Sudah Dijawab</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#fef3c7', border: '1px solid #d97706', borderRadius: '3px' }}></span> Ragu-ragu</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px' }}></span> Belum Dijawab</div>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              style={{ width: '100%', padding: '10px 0', borderRadius: '10px', background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: '800', cursor: 'pointer', marginTop: '16px' }}
            >
              Selesai Ujian
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="modal-overlay" onClick={() => setShowConfirmModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#d97706', marginBottom: '12px' }}>help_outline</span>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800' }}>Kumpulkan Ujian CBT?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Apakah Anda yakin ingin mengumpulkan lembar jawaban ujian CBT ini sekarang?</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => setShowConfirmModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button onClick={() => handleSubmitExam(false)} disabled={isSubmitting} style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
                  {isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter exams based on selected tab
  const activeExamsList = exams.filter(e => !e.has_submitted);
  const completedExamsList = exams.filter(e => e.has_submitted);

  return (
    <div className="cbt-container">
      <div className="cbt-page-header">
        <div>
          <h1 className="page-title">Ujian CBT (Computer Based Test)</h1>
          <p className="page-subtitle">Kerjakan Ujian CBT resmi kelas Anda dan lihat riwayat beserta pembahasan hasil ujian.</p>
        </div>
      </div>

      {error && <div className="cbt-alert-error">{error}</div>}

      {/* TAB SELECTION */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveMainTab('active_exams')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeMainTab === 'active_exams' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeMainTab === 'active_exams' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">computer</span> Ujian Aktif ({activeExamsList.length})
        </button>
        <button
          onClick={() => setActiveMainTab('history')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeMainTab === 'history' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeMainTab === 'history' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">history</span> Riwayat Ujian ({completedExamsList.length})
        </button>
      </div>

      {/* TAB 1: UJIAN CBT AKTIF */}
      {activeMainTab === 'active_exams' && (
        <div>
          {activeExamsList.length > 0 ? (
            <div className="cbt-exams-grid">
              {activeExamsList.map((exam) => {
                const sched = getExamScheduleStatus(exam);
                return (
                  <div key={exam._id} className="cbt-exam-card">
                    <div className="exam-card-header">
                      <span className="subject-badge">{exam.subject_name || exam.subject?.name || 'Mata Pelajaran'}</span>
                      <span className={`status-badge ${sched.class}`}>{sched.label}</span>
                    </div>

                    <h3 className="exam-card-title">{exam.title}</h3>
                    <p className="exam-teacher">Guru Pengampu: {exam.teacher?.full_name || exam.teacher_name || '-'}</p>

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
                      <button
                        className="cbt-btn-card start"
                        disabled={!sched.isAvailable}
                        onClick={() => handleStartExam(exam._id)}
                        style={!sched.isAvailable ? { opacity: 0.5, cursor: 'not-allowed', background: '#cbd5e1' } : {}}
                      >
                        <span className="material-symbols-outlined">play_arrow</span>
                        {sched.isAvailable ? 'Mulai Ujian CBT' : 'Belum Tersedia'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cbt-empty-state">
              <span className="material-symbols-outlined empty-icon">quiz</span>
              <h3>Tidak Ada Ujian Aktif</h3>
              <p>Belum ada ujian CBT baru yang dijadwalkan untuk kelas Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT UJIAN CBT */}
      {activeMainTab === 'history' && (
        <div>
          {completedExamsList.length > 0 ? (
            <div className="cbt-exams-grid">
              {completedExamsList.map((exam) => (
                <div key={exam._id} className="cbt-exam-card">
                  <div className="exam-card-header">
                    <span className="subject-badge">{exam.subject_name || exam.subject?.name || 'Mata Pelajaran'}</span>
                    <span className={`status-badge ${exam.my_result?.is_passed ? 'passed' : 'failed'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Selesai (Nilai: {exam.my_score || 0})
                    </span>
                  </div>

                  <h3 className="exam-card-title">{exam.title}</h3>
                  <p className="exam-teacher">Guru Pengampu: {exam.teacher?.full_name || exam.teacher_name || '-'}</p>

                  <div className="exam-meta-details">
                    <div className="meta-item">
                      <span className="material-symbols-outlined">help</span>
                      <span>{exam.total_questions || 0} Soal</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-symbols-outlined">grade</span>
                      <span>KKM: {exam.pass_score || 75}</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-symbols-outlined">event_available</span>
                      <span style={{ fontSize: '11px' }}>
                        {exam.my_result?.submitted_at ? new Date(exam.my_result.submitted_at).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="exam-card-actions">
                    <button className="cbt-btn-card review" onClick={() => handleStartExam(exam._id)}>
                      <span className="material-symbols-outlined">visibility</span>
                      Lihat Hasil & Pembahasan Soal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cbt-empty-state">
              <span className="material-symbols-outlined empty-icon">history</span>
              <h3>Belum Ada Riwayat Ujian</h3>
              <p>Anda belum pernah menyelesaikan ujian CBT.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SiswaCbt;
