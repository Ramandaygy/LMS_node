import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-cbt.css';

const SiswaCbt = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Exam Session State
  const [activeExam, setActiveExam] = useState(null); // Full exam object
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { 0: { selected: 1, flagged: false }, ... }
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Result & Review State
  const [examResult, setExamResult] = useState(null); // Object from backend submit/detail
  const [reviewExam, setReviewExam] = useState(null); // Full exam details for review

  useEffect(() => {
    fetchExams();
  }, []);

  // Timer Countdown Effect
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

  const handleStartExam = async (examId) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/cbt/exams/${examId}`);
      if (res.data.success) {
        if (res.data.is_completed) {
          // Already completed, show review
          setReviewExam(res.data.exam);
          setExamResult(res.data.result);
          setActiveExam(null);
        } else {
          // Start exam session
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
        selected: prev[qIdx]?.selected !== undefined ? prev[qIdx].selected : -1,
        flagged: !prev[qIdx]?.flagged,
      },
    }));
  };

  const autoSubmitExam = () => {
    handleSubmitExam(true);
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (!activeExam) return;
    try {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      const formattedAnswers = Object.entries(userAnswers).map(([idxStr, ansObj]) => ({
        question_index: parseInt(idxStr, 10),
        selected_option: ansObj.selected,
        is_flagged: ansObj.flagged,
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
        // Fetch full exam detail with correct answers & explanations for review
        const reviewRes = await api.get(`/cbt/exams/${activeExam._id}`);
        if (reviewRes.data.success) {
          setReviewExam(reviewRes.data.exam);
        }
        setActiveExam(null);
        fetchExams(); // refresh list status
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      alert(err.response?.data?.message || 'Gagal mengumpulkan ujian. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (score, maxScore = 100) => {
    const numScore = Number(score) || 0;
    const percentage = (numScore / maxScore) * 100;
    let starsCount = 5;
    if (percentage < 20) starsCount = 1;
    else if (percentage < 40) starsCount = 2;
    else if (percentage < 60) starsCount = 3;
    else if (percentage < 80) starsCount = 4;
    else starsCount = 5;

    const starsArr = [];
    for (let i = 1; i <= 5; i++) {
      starsArr.push(
        <span 
          key={i} 
          className="material-symbols-outlined" 
          style={{ 
            color: i <= starsCount ? '#f59e0b' : '#cbd5e1', 
            fontSize: '18px',
            verticalAlign: 'middle'
          }}
        >
          {i <= starsCount ? 'star' : 'star_outline'}
        </span>
      );
    }

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }} title={`Perolehan: ${starsCount} Bintang (Skor: ${numScore})`}>
        {starsArr}
      </div>
    );
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Status helper for question navigation grid
  const getQuestionStatus = (idx) => {
    const ans = userAnswers[idx];
    if (ans?.flagged) return 'flagged'; // Ragu-ragu (Yellow)
    if (ans?.selected !== undefined && ans?.selected !== -1) return 'answered'; // Hijau
    return 'unanswered'; // Abu-abu
  };

  if (loading && !activeExam && !reviewExam) {
    return <div className="cbt-loading">Memuat Ujian CBT...</div>;
  }

  // =========================================================================
  // VIEW 3: RESULT & DISCUSSION (PEMBAHASAN SOAL)
  // =========================================================================
  if (examResult && reviewExam) {
    return (
      <div className="cbt-container">
        <div className="cbt-header">
          <div className="cbt-title-area">
            <h1>Hasil Ujian CBT: {reviewExam.title}</h1>
            <p>Mata Pelajaran: {reviewExam.subject?.name || '-'} | Pengampu: {reviewExam.teacher?.full_name || '-'}</p>
          </div>
          <button className="cbt-btn-secondary" onClick={() => { setExamResult(null); setReviewExam(null); }}>
            <span className="material-symbols-outlined">arrow_back</span>
            Kembali ke Daftar Ujian
          </button>
        </div>

        {/* Score Summary Box */}
        <div className="cbt-result-summary-card">
          <div className={`score-badge-circle ${examResult.is_passed ? 'passed' : 'failed'}`} style={{ width: 'auto', minWidth: '200px', height: 'auto', borderRadius: '24px', padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginBottom: '6px' }}>
              {renderStarRating(examResult.score, 100)}
            </div>
            <span className="score-label" style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Perolehan Bintang ({examResult.score} Poin)
            </span>
          </div>

          <div className="result-stats-grid">
            <div className="stat-box">
              <span className="stat-label">Status Kelulusan</span>
              <span className={`stat-value ${examResult.is_passed ? 'text-green' : 'text-red'}`}>
                {examResult.is_passed ? 'LULUS (Di Atas KKM)' : 'BELUM LULUS KKM'}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Jawaban Benar</span>
              <span className="stat-value text-green">{examResult.correct_count} Soal</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Jawaban Salah</span>
              <span className="stat-value text-red">{examResult.wrong_count} Soal</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Tidak Dijawab</span>
              <span className="stat-value text-gray">{examResult.unanswered_count} Soal</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Waktu Pengerjaan</span>
              <span className="stat-value">{formatTime(examResult.time_spent_seconds)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Review & Discussion */}
        <div className="cbt-section-title">
          <span className="material-symbols-outlined">analytics</span>
          <h2>Peninjauan Jawaban & Pembahasan Soal</h2>
        </div>

        <div className="review-questions-list">
          {reviewExam.questions.map((q, idx) => {
            const resultAns = examResult.answers.find((a) => a.question_index === idx);
            const selectedOpt = resultAns ? resultAns.selected_option : -1;
            const isCorrect = resultAns ? resultAns.is_correct : false;

            return (
              <div key={idx} className={`review-question-card ${isCorrect ? 'correct-border' : 'wrong-border'}`}>
                <div className="review-question-header">
                  <span className="question-number-badge">Soal #{idx + 1}</span>
                  <span className={`badge-status ${isCorrect ? 'badge-correct' : 'badge-wrong'}`}>
                    <span className="material-symbols-outlined">{isCorrect ? 'check_circle' : 'cancel'}</span>
                    {isCorrect ? 'Jawaban Benar (+10)' : 'Jawaban Salah / Kosong'}
                  </span>
                </div>

                <p className="question-text">{q.question_text}</p>

                <div className="review-options-list">
                  {q.options.map((opt, oIdx) => {
                    const isSelectedByStudent = selectedOpt === oIdx;
                    const isRightOption = q.correct_option === oIdx;

                    let optionClass = 'review-option';
                    if (isRightOption) optionClass += ' right-answer';
                    if (isSelectedByStudent && !isRightOption) optionClass += ' student-wrong-answer';

                    return (
                      <div key={oIdx} className={optionClass}>
                        <span className="option-prefix">{String.fromCharCode(65 + oIdx)}.</span>
                        <span className="option-text">{opt}</span>
                        {isRightOption && <span className="tag-kunci">Kunci Jawaban</span>}
                        {isSelectedByStudent && <span className="tag-pilihan">Jawaban Anda</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="explanation-box">
                    <strong>Pembahasan:</strong>
                    <p>{q.explanation}</p>
                  </div>
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
      <div className="cbt-exam-wrapper">
        {/* Header Navigation & Countdown */}
        <header className="cbt-exam-header">
          <div className="exam-info">
            <h2 className="exam-title">{activeExam.title}</h2>
            <span className="exam-meta">Mapel: {activeExam.subject?.name || '-'} | KKM: {activeExam.pass_score || 75}</span>
          </div>

          <div className={`cbt-timer-badge ${timeLeftSeconds < 300 ? 'timer-urgent' : ''}`}>
            <span className="material-symbols-outlined">timer</span>
            <span>Sisa Waktu: <strong>{formatTime(timeLeftSeconds)}</strong></span>
          </div>
        </header>

        {/* Main Body: Question Left, Navigation Grid Right */}
        <div className="cbt-exam-body">
          {/* Question Display Area */}
          <div className="cbt-question-area">
            <div className="question-header-bar">
              <span className="question-counter">Soal Nomor {currentQuestionIdx + 1} dari {activeExam.questions.length}</span>

              <label className="flag-checkbox-label">
                <input
                  type="checkbox"
                  checked={!!currentAns.flagged}
                  onChange={() => handleToggleFlag(currentQuestionIdx)}
                />
                <span className="material-symbols-outlined flag-icon">flag</span>
                Ragu-ragu
              </label>
            </div>

            <div className="question-content-box">
              <p className="question-text">{currentQ.question_text}</p>

              <div className="options-group">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = currentAns.selected === oIdx;

                  return (
                    <button
                      key={oIdx}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(currentQuestionIdx, oIdx)}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + oIdx)}</span>
                      <span className="option-label-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="cbt-exam-actions">
              <button
                className="cbt-btn-nav"
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Sebelumnya
              </button>

              {isLastQuestion ? (
                <button className="cbt-btn-submit" onClick={() => setShowConfirmModal(true)}>
                  <span className="material-symbols-outlined">task_alt</span>
                  Selesai & Kumpulkan Ujian
                </button>
              ) : (
                <button
                  className="cbt-btn-nav primary"
                  onClick={() => setCurrentQuestionIdx((prev) => Math.min(activeExam.questions.length - 1, prev + 1))}
                >
                  Selanjutnya
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Navigation Grid (Right Sidebar) */}
          <div className="cbt-grid-sidebar">
            <h3 className="grid-title">Navigasi Soal</h3>

            <div className="question-grid-container">
              {activeExam.questions.map((_, idx) => {
                const status = getQuestionStatus(idx);
                const isActive = idx === currentQuestionIdx;

                return (
                  <button
                    key={idx}
                    className={`grid-num-btn ${status} ${isActive ? 'active-grid' : ''}`}
                    onClick={() => setCurrentQuestionIdx(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="grid-legend-box">
              <div className="legend-item"><span className="legend-dot answered"></span> Sudah Dijawab</div>
              <div className="legend-item"><span className="legend-dot flagged"></span> Ragu-ragu</div>
              <div className="legend-item"><span className="legend-dot unanswered"></span> Belum Dijawab</div>
            </div>

            <button className="cbt-btn-submit-sidebar" onClick={() => setShowConfirmModal(true)}>
              Selesai Ujian
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
            <div className="modal-content-cbt" onClick={(e) => e.stopPropagation()}>
              <span className="material-symbols-outlined modal-icon">help_outline</span>
              <h3>Konfirmasi Pengumpulan Ujian</h3>
              <p>Apakah Anda yakin ingin mengumpulkan lembar jawaban ujian CBT ini sekarang?</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>
                  Batal / Periksa Kembali
                </button>
                <button className="btn-confirm" disabled={isSubmitting} onClick={() => handleSubmitExam(false)}>
                  {isSubmitting ? 'Mengirimkan...' : 'Ya, Kumpulkan Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: EXAM LIST (DAFTAR UJIAN CBT SISWA)
  // =========================================================================
  return (
    <div className="cbt-container">
      <div className="cbt-page-header">
        <div>
          <h1 className="page-title">Simulasi & Ujian CBT (Computer Based Test)</h1>
          <p className="page-subtitle">Pilih paket ujian CBT yang tersedia untuk memulai latihan atau ujian interaktif.</p>
        </div>
      </div>

      {error && <div className="cbt-alert-error">{error}</div>}

      {exams.length > 0 ? (
        <div className="cbt-exams-grid">
          {exams.map((exam) => (
            <div key={exam._id} className="cbt-exam-card">
              <div className="exam-card-header">
                <span className="subject-badge">{exam.subject?.name || 'Mata Pelajaran'}</span>
                {exam.has_submitted ? (
                  <span className={`status-badge ${exam.my_result?.is_passed ? 'passed' : 'failed'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Selesai {renderStarRating(exam.my_score || 0)}
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
                {exam.has_submitted ? (
                  <button className="cbt-btn-card review" onClick={() => handleStartExam(exam._id)}>
                    <span className="material-symbols-outlined">visibility</span>
                    Lihat Hasil & Pembahasan
                  </button>
                ) : (
                  <button className="cbt-btn-card start" onClick={() => handleStartExam(exam._id)}>
                    <span className="material-symbols-outlined">play_arrow</span>
                    Mulai Ujian CBT
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cbt-empty-state">
          <span className="material-symbols-outlined empty-icon">quiz</span>
          <h3>Belum Ada Paket Ujian CBT Aktif</h3>
          <p>Saat ini belum ada paket ujian CBT yang dipublikasikan oleh guru Anda.</p>
        </div>
      )}
    </div>
  );
};

export default SiswaCbt;
