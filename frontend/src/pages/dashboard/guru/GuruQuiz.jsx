import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-quiz.css';

const GuruQuiz = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passScore, setPassScore] = useState(75);

  // Question Form State
  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_option: 0, explanation: '' }
  ]);

  // Results Modal State
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchSubjectsAndClasses();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cbt/exams');
      if (res.data.success) {
        setExams(res.data.exams || []);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('Gagal memuat daftar Ujian CBT.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      const [subRes, clsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classes')
      ]);
      const subList = subRes.data.data || [];
      const clsList = clsRes.data.data || [];

      setSubjects(subList);
      setClasses(clsList);

      if (subList.length > 0) setSelectedSubject(subList[0]._id);
      if (clsList.length > 0) setSelectedClass(clsList[0]._id);
    } catch (err) {
      console.error('Error fetching master subjects/classes:', err);
    }
  };

  // Question Manipulations
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question_text: '', options: ['', '', '', ''], correct_option: 0, explanation: '' }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx, value) => {
    const updated = [...questions];
    updated[idx].question_text = value;
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIdx, oIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (qIdx, oIdx) => {
    const updated = [...questions];
    updated[qIdx].correct_option = oIdx;
    setQuestions(updated);
  };

  const handleExplanationChange = (qIdx, value) => {
    const updated = [...questions];
    updated[qIdx].explanation = value;
    setQuestions(updated);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !selectedSubject) {
      setError('Judul ujian dan mata pelajaran wajib diisi.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`Teks soal nomor ${i + 1} belum diisi.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          setError(`Pilihan jawaban ${String.fromCharCode(65 + j)} pada soal nomor ${i + 1} belum diisi.`);
          return;
        }
      }
    }

    try {
      const payload = {
        title,
        subject: selectedSubject,
        class_id: selectedClass || null,
        duration_minutes: Number(durationMinutes),
        pass_score: Number(passScore),
        is_active: true,
        questions
      };

      const res = await api.post('/cbt/exams', payload);
      if (res.data.success) {
        setSuccess('Paket Ujian CBT berhasil dibuat dan dipublikasikan.');
        setShowCreateModal(false);
        // Reset form
        setTitle('');
        setQuestions([{ question_text: '', options: ['', '', '', ''], correct_option: 0, explanation: '' }]);
        fetchExams();
      }
    } catch (err) {
      console.error('Error saving exam:', err);
      setError(err.response?.data?.message || 'Gagal menyimpan Paket Ujian CBT.');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus paket Ujian CBT ini beserta seluruh hasilnya?')) return;
    try {
      const res = await api.delete(`/cbt/exams/${id}`);
      if (res.data.success) {
        setSuccess('Paket Ujian CBT berhasil dihapus.');
        fetchExams();
      }
    } catch (err) {
      console.error('Error deleting exam:', err);
      setError('Gagal menghapus paket Ujian CBT.');
    }
  };

  const handleToggleActive = async (exam) => {
    try {
      const res = await api.put(`/cbt/exams/${exam._id}`, { is_active: !exam.is_active });
      if (res.data.success) {
        fetchExams();
      }
    } catch (err) {
      console.error('Error toggling exam status:', err);
    }
  };

  const handleViewResults = async (exam) => {
    setSelectedExamForResults(exam);
    setShowResultsModal(true);
    setLoadingResults(true);
    try {
      const res = await api.get(`/cbt/exams/${exam._id}/results`);
      if (res.data.success) {
        setExamResults(res.data.results || []);
      }
    } catch (err) {
      console.error('Error fetching exam results:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  if (loading) return <div className="cbt-guru-loading">Memuat Manajemen Ujian CBT...</div>;

  return (
    <div className="guru-cbt-container">
      <div className="guru-cbt-header">
        <div>
          <h1 className="page-title">Manajemen Ujian & Quiz CBT (Computer Based Test)</h1>
          <p className="page-subtitle">Kelola paket soal pilihan ganda, atur timer ujian, dan lihat rekapitulasi nilai siswa secara otomatis.</p>
        </div>

        <button className="btn-create-exam" onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">add_circle</span>
          Buat Ujian CBT Baru
        </button>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {success && <div className="alert-box success">{success}</div>}

      {/* List of Exams */}
      <div className="exams-table-container">
        <table className="guru-cbt-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Judul Paket Ujian</th>
              <th>Mata Pelajaran</th>
              <th>Jumlah Soal</th>
              <th>Durasi</th>
              <th>KKM</th>
              <th>Status Aktif</th>
              <th>Aksi & Hasil</th>
            </tr>
          </thead>
          <tbody>
            {exams.length > 0 ? (
              exams.map((exam, idx) => (
                <tr key={exam._id}>
                  <td className="text-center">{idx + 1}</td>
                  <td className="font-bold">{exam.title}</td>
                  <td>{exam.subject?.name || '-'}</td>
                  <td className="text-center">{exam.total_questions || 0} Soal</td>
                  <td className="text-center">{exam.duration_minutes} Menit</td>
                  <td className="text-center font-bold text-sky">{exam.pass_score}</td>
                  <td className="text-center">
                    <button
                      className={`status-toggle-btn ${exam.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(exam)}
                    >
                      {exam.is_active ? 'Aktif (Bisa Dikerjakan)' : 'Non-Aktif'}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button className="btn-action view" onClick={() => handleViewResults(exam)}>
                        <span className="material-symbols-outlined">analytics</span>
                        Hasil Siswa
                      </button>
                      <button className="btn-action delete" onClick={() => handleDeleteExam(exam._id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center empty-table">
                  Belum ada paket Ujian CBT yang dibuat. Klik tombol "Buat Ujian CBT Baru" di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE CBT EXAM MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Paket Ujian CBT Baru</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="cbt-form">
              <div className="form-row-grid">
                <div className="form-group">
                  <label>Judul Ujian CBT *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Latihan Ujian CBT Informatika Bab 3"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Mata Pelajaran *</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="form-select"
                  >
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid tri">
                <div className="form-group">
                  <label>Target Kelas (Opsional)</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>Kelas {cls.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Durasi (Menit) *</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>KKM (Nilai Kelulusan) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={passScore}
                    onChange={(e) => setPassScore(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* QUESTIONS BUILDER SECTION */}
              <div className="questions-section-header">
                <h3>Daftar Soal Pilihan Ganda ({questions.length} Soal)</h3>
                <button type="button" className="btn-add-q" onClick={handleAddQuestion}>
                  <span className="material-symbols-outlined">add</span>
                  Tambah Soal
                </button>
              </div>

              <div className="questions-list-form">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="question-item-card">
                    <div className="q-card-header">
                      <span className="q-number">Soal Nomor #{qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="btn-delete-q"
                          onClick={() => handleRemoveQuestion(qIdx)}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Pertanyaan / Pertanyaan Teks *</label>
                      <textarea
                        rows="2"
                        required
                        placeholder="Tuliskan pertanyaan di sini..."
                        value={q.question_text}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        className="form-textarea"
                      />
                    </div>

                    <div className="options-input-grid">
                      {['A', 'B', 'C', 'D'].map((letter, oIdx) => (
                        <div key={oIdx} className="option-input-item">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correct_option === oIdx}
                              onChange={() => handleCorrectOptionChange(qIdx, oIdx)}
                            />
                            <strong>{letter}</strong> (Kunci)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Pilihan ${letter}...`}
                            value={q.options[oIdx]}
                            onChange={(e) => handleOptionTextChange(qIdx, oIdx, e.target.value)}
                            className="form-input opt-input"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label>Pembahasan / Penjelasan Kunci (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Penjelasan mengapa kunci jawaban tersebut benar..."
                        value={q.explanation}
                        onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-submit-exam">
                  Simpan & Publikasikan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESULTS REKAP MODAL FOR GURU */}
      {showResultsModal && selectedExamForResults && (
        <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Rekapitulasi Hasil Ujian CBT Siswa</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedExamForResults.title}</p>
              </div>
              <button className="btn-close" onClick={() => setShowResultsModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {loadingResults ? (
              <div className="cbt-guru-loading">Memuat hasil siswa...</div>
            ) : (
              <div className="exam-results-table-wrapper">
                <table className="guru-cbt-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Siswa</th>
                      <th>NIS</th>
                      <th>Kelas</th>
                      <th>Benar</th>
                      <th>Salah</th>
                      <th>Skor CBT</th>
                      <th>Status KKM</th>
                      <th>Waktu Mengumpulkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.length > 0 ? (
                      examResults.map((resItem, idx) => (
                        <tr key={resItem._id}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="font-bold">{resItem.student?.full_name || '-'}</td>
                          <td className="text-center">{resItem.student?.nis || '-'}</td>
                          <td className="text-center">{resItem.student?.class_name || '-'}</td>
                          <td className="text-center text-green font-bold">{resItem.correct_count}</td>
                          <td className="text-center text-red font-bold">{resItem.wrong_count}</td>
                          <td className="text-center font-bold" style={{ fontSize: '16px', color: resItem.is_passed ? '#16a34a' : '#dc2626' }}>
                            {resItem.score}
                          </td>
                          <td className="text-center">
                            <span className={`status-badge ${resItem.is_passed ? 'passed' : 'failed'}`}>
                              {resItem.is_passed ? 'LULUS' : 'REMIDIAL'}
                            </span>
                          </td>
                          <td className="text-center" style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(resItem.submitted_at).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center empty-table">
                          Belum ada siswa yang mengumpulkan ujian ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruQuiz;
