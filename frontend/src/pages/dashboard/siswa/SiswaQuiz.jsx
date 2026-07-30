import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-cbt.css'; // Reuse CBT style for quizzes

const SiswaQuiz = () => {
  const [studentQuizzes, setStudentQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null); // Full quiz object for attempting
  const [quizAnswers, setQuizAnswers] = useState({}); // { 0: 1, 1: 0 }
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null); // { score, star_rating }
  const [quizLeaderboardModal, setQuizLeaderboardModal] = useState(null); // { quiz, submissions: [] }

  useEffect(() => {
    fetchStudentQuizzes(true);
  }, []);

  const fetchStudentQuizzes = async (showFullLoader = false) => {
    try {
      if (showFullLoader) setLoading(true);
      const res = await api.get('/quiz');
      const all = res.data.quizzes || [];
      setStudentQuizzes(all.filter(q => !q.is_master));
    } catch (err) {
      console.error('Error fetching student quizzes:', err);
      setError('Gagal memuat kuis live.');
    } finally {
      if (showFullLoader) setLoading(false);
    }
  };

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
        fetchStudentQuizzes(false);
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

  if (loading && !activeQuiz) {
    return <div className="cbt-loading">Memuat Kuis Live Sesi...</div>;
  }

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
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>APRESIASI BINTANG PERFORMA</div>
              <div>
                {renderStars(quizResult.star_rating)}
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#f59e0b', marginLeft: '6px', display: 'block', marginTop: '6px' }}>
                  ({quizResult.star_rating} Bintang ⭐)
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

  return (
    <div className="cbt-container">
      <div className="cbt-page-header">
        <div>
          <h1 className="page-title">Live Quiz Sesi Kelas</h1>
          <p className="page-subtitle">Kerjakan Kuis Live interaktif di kelas Anda untuk mengumpulkan Bintang ⭐ dan Nilai.</p>
        </div>
      </div>

      {error && <div className="cbt-alert-error">{error}</div>}

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
          <h3>Belum Ada Kuis Sesi Aktif</h3>
          <p>Belum ada kuis interaktif yang sedang berlangsung di kelas Anda.</p>
        </div>
      )}

      {/* LEADERBOARD MODAL */}
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

export default SiswaQuiz;
