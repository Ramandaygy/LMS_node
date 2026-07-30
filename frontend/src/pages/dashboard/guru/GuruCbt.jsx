import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-cbt.css';

const GuruCbt = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown Data Actions State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passScore, setPassScore] = useState(75);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hideCorrectAnswers, setHideCorrectAnswers] = useState(true);

  // Question Form State
  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_option: 0, explanation: '' }
  ]);

  // Results Modal State
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Distribute Modal State
  const [distributeModal, setDistributeModal] = useState(null);
  const [targetClassForDistribute, setTargetClassForDistribute] = useState('');
  const [targetSessionForDistribute, setTargetSessionForDistribute] = useState(1);
  const [distributeStartTime, setDistributeStartTime] = useState('');
  const [distributeEndTime, setDistributeEndTime] = useState('');
  const [distributeHideCorrectAnswers, setDistributeHideCorrectAnswers] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const handlePublishCbtToClassSession = async () => {
    if (!distributeModal || !distributeModal.targetExam) return;
    setDistributing(true);
    try {
      const targetClass = targetClassForDistribute || (classes[0]?._id || classes[0]?.id || '8B');
      await api.post('/cbt/distribute', {
        master_exam_id: distributeModal.targetExam._id,
        class_id: targetClass,
        session_number: Number(targetSessionForDistribute) || 1,
        duration_minutes: distributeModal.targetExam.duration_minutes,
        pass_score: distributeModal.targetExam.pass_score,
        start_time: distributeStartTime || null,
        end_time: distributeEndTime || null,
        hide_correct_answers: distributeHideCorrectAnswers
      });
      alert(`Berhasil menerbitkan Ujian CBT "${distributeModal.targetExam.title}" ke Sesi ke-${targetSessionForDistribute}!`);
      setDistributeModal(null);
      fetchExams();
    } catch (err) {
      console.error('Error distributing CBT:', err);
      alert(err.response?.data?.message || 'Gagal menerbitkan Ujian CBT.');
    } finally {
      setDistributing(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchSubjectsAndClasses();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      const subList = subRes.data.data || subRes.data.subjects || [];
      const clsList = clsRes.data.data || clsRes.data.classes || [];

      setSubjects(subList);
      setClasses(clsList);

      if (subList.length > 0 && !selectedSubject) setSelectedSubject(subList[0]._id || subList[0].id);
      if (clsList.length > 0 && !selectedClass) setSelectedClass(clsList[0]._id || clsList[0].id);
    } catch (err) {
      console.error('Error fetching master subjects/classes:', err);
    }
  };

  // Excel Actions (Master Data Style)
  const handleDownloadTemplate = async () => {
    setDropdownOpen(false);
    setTemplateLoading(true);
    try {
      const response = await api.get('/cbt/template-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_Soal_CBT.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Template Excel Soal CBT berhasil diunduh.');
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Gagal mengunduh template Excel.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportExcelClick = () => {
    setDropdownOpen(false);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleModalImportClick = () => {
    if (modalFileInputRef.current) modalFileInputRef.current.click();
  };

  const handleExcelFileChange = async (e, isModal = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImportLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/cbt/import-questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const importedQuestions = response.data.questions || [];

        if (isModal || showCreateModal) {
          setQuestions((prev) => [...prev.filter(q => q.question_text.trim() !== ''), ...importedQuestions]);
          setSuccess(`Berhasil mengimpor ${importedQuestions.length} soal dari Excel ke form pembuatan ujian.`);
        } else {
          setQuestions(importedQuestions);
          setShowCreateModal(true);
          setSuccess(`Berhasil mengimpor ${importedQuestions.length} soal dari Excel. Silakan lengkapi Judul Ujian & Simpan.`);
        }
      }
    } catch (err) {
      console.error('Error importing Excel:', err);
      setError(err.response?.data?.message || 'Gagal mengimpor file Excel.');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const handleExportExamResultsExcel = async (examId, examTitle) => {
    try {
      const response = await api.get(`/cbt/exams/${examId}/export-excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (examTitle || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `Hasil_CBT_${safeTitle}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CBT Excel:', err);
      alert('Gagal meng-export data ke Excel.');
    }
  };

  // Question Form Manipulations
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
        title: title.trim(),
        subject: selectedSubject,
        class_id: selectedClass || null,
        duration_minutes: Number(durationMinutes),
        pass_score: Number(passScore),
        is_active: true,
        start_time: startTime || null,
        end_time: endTime || null,
        hide_correct_answers: hideCorrectAnswers,
        questions
      };

      const res = await api.post('/cbt/exams', payload);
      if (res.data.success) {
        setSuccess('Paket Ujian CBT berhasil dibuat dan dipublikasikan.');
        setShowCreateModal(false);
        setTitle('');
        setStartTime('');
        setEndTime('');
        setHideCorrectAnswers(true);
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

  const handleOpenDistribute = (exam) => {
    setDistributeModal({ targetExam: exam });
    setDistributeStartTime(exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '');
    setDistributeEndTime(exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '');
    setDistributeHideCorrectAnswers(exam.hide_correct_answers !== undefined ? exam.hide_correct_answers : true);
  };

  if (loading) return <div className="cbt-guru-loading">Memuat Manajemen Ujian CBT...</div>;

  return (
    <div className="guru-cbt-container">
      {/* Hidden File Inputs for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleExcelFileChange(e, false)}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={modalFileInputRef}
        onChange={(e) => handleExcelFileChange(e, true)}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      {/* Header Bar matching Master Data styling */}
      <div className="guru-cbt-header">
        <div>
          <h1 className="page-title">Manajemen Ujian CBT (Computer Based Test)</h1>
          <p className="page-subtitle">Kelola paket soal pilihan ganda, import/export via Excel, dan lihat rekapitulasi nilai siswa secara otomatis.</p>
        </div>

        {/* Action Buttons matching Master Data styling */}
        <div className="header-buttons">
          <div className="dropdown" ref={dropdownRef}>
            <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span className="material-symbols-outlined">file_present</span> Data
              <span className="material-symbols-outlined dropdown-arrow">expand_more</span>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-group">
                  <div className="dropdown-group-title">IMPORT SOAL</div>
                  <button onClick={handleImportExcelClick} disabled={importLoading}>
                    <span className="material-symbols-outlined">upload_file</span>
                    {importLoading ? 'Memproses...' : 'Import Soal dari Excel'}
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group">
                  <div className="dropdown-group-title">TEMPLATE EXCEL</div>
                  <button onClick={handleDownloadTemplate} disabled={templateLoading}>
                    <span className="material-symbols-outlined">description</span>
                    {templateLoading ? 'Mengunduh...' : 'Download Template Soal (.xlsx)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="btn-create-exam" onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined">add</span> Buat Ujian CBT Baru
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {success && <div className="alert-box success">{success}</div>}

      {/* List of Exams */}
      <div className="exams-table-container">
        <table className="guru-cbt-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Judul Ujian</th>
              <th>Mata Pelajaran</th>
              <th>Target Kelas</th>
              <th>Durasi / KKM</th>
              <th>Waktu Aktif</th>
              <th>Pertanyaan</th>
              <th>Aksi Ujian</th>
            </tr>
          </thead>
          <tbody>
            {exams.length > 0 ? (
              exams.map((exam) => (
                <tr key={exam._id}>
                  <td className="text-center">
                    <button
                      onClick={() => handleToggleActive(exam)}
                      className={`status-toggle-btn ${exam.is_active ? 'active' : 'inactive'}`}
                      title={exam.is_active ? 'Nonaktifkan Ujian' : 'Aktifkan Ujian'}
                    >
                      {exam.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="font-bold">{exam.title}</td>
                  <td>{exam.subject_name || exam.subject?.name || '-'}</td>
                  <td className="text-center font-bold">
                    {exam.is_master ? (
                      <span className="badge-master">Master Bank</span>
                    ) : (
                      exam.class_name || 'Semua Kelas'
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>⏱️ {exam.duration_minutes} Menit</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>🎯 KKM: {exam.pass_score}</div>
                  </td>
                  <td style={{ fontSize: '11px', color: '#334155' }}>
                    {exam.start_time && exam.end_time ? (
                      <div>
                        <div>📅 {new Date(exam.start_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
                        <div>s/d {new Date(exam.end_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Selalu Aktif</span>
                    )}
                  </td>
                  <td className="text-center font-bold">{exam.total_questions || exam.questions?.length || 0} Soal</td>
                  <td>
                    <div className="table-actions">
                      {exam.is_master ? (
                        <button
                          className="btn-action distribute"
                          onClick={() => handleOpenDistribute(exam)}
                          title="Sematkan Ujian ke Kelas & Sesi"
                        >
                          <span className="material-symbols-outlined">publish</span>
                          Sematkan
                        </button>
                      ) : (
                        <button
                          className="btn-action results"
                          onClick={() => handleViewResults(exam)}
                          title="Lihat Nilai Siswa"
                        >
                          <span className="material-symbols-outlined">analytics</span>
                          Nilai
                        </button>
                      )}
                      <button
                        className="btn-action delete"
                        onClick={() => handleDeleteExam(exam._id)}
                        title="Hapus Ujian"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center empty-table">
                  Belum ada paket Ujian CBT yang dibuat. Klik tombol "Buat Ujian CBT Baru" atau "Import Soal dari Excel" di atas.
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
                  <label>Batas Nilai Lulus (KKM) *</label>
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

              {/* DATE RANGE SCHEDULE & ANSWER KEY PRIVACY */}
              <div className="form-row-grid" style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div className="form-group">
                  <label style={{ color: '#0284c7', fontWeight: '800' }}>Waktu Mulai Ujian (Jadwal Mulai)</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#dc2626', fontWeight: '800' }}>Waktu Selesai Ujian (Jadwal Selesai)</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    id="hideCorrectAnswers"
                    checked={hideCorrectAnswers}
                    onChange={(e) => setHideCorrectAnswers(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="hideCorrectAnswers" style={{ fontWeight: '800', cursor: 'pointer', margin: 0 }}>
                    Sembunyikan Kunci Jawaban Setelah Ujian (Siswa tidak bisa melihat kunci/jawaban yang betul)
                  </label>
                </div>
              </div>

              {/* Soal Ujian */}
              <div className="form-questions-section" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3>Soal Pilihan Ganda ({questions.length})</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-action distribute" onClick={handleModalImportClick}>
                      <span className="material-symbols-outlined">upload_file</span> Import Excel
                    </button>
                    <button type="button" className="btn-add-question" onClick={handleAddQuestion}>
                      + Tambah Soal
                    </button>
                  </div>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="question-builder-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>Nomor Soal #{qIdx + 1}</strong>
                      {questions.length > 1 && (
                        <button type="button" onClick={() => handleRemoveQuestion(qIdx)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '800' }}>Hapus</button>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Pertanyaan *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ketik pertanyaan kuis..."
                        value={q.question_text}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                      {['A', 'B', 'C', 'D'].map((letter, oIdx) => (
                        <div key={oIdx} className="option-builder-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correct_option === oIdx}
                              onChange={() => handleCorrectOptionChange(qIdx, oIdx)}
                            />
                            <strong>{letter}</strong>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Pilihan ${letter}...`}
                            value={q.options[oIdx]}
                            onChange={(e) => handleOptionTextChange(qIdx, oIdx, e.target.value)}
                            className="form-input"
                            style={{ flex: 1 }}
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
              <div className="results-modal-actions">
                <button
                  className="btn-action excel"
                  onClick={() => handleExportExamResultsExcel(selectedExamForResults._id, selectedExamForResults.title)}
                >
                  <span className="material-symbols-outlined">download</span>
                  Export Excel
                </button>
                <button className="btn-close" onClick={() => setShowResultsModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
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

      {/* POPUP DISTRIBUTE / PUBLISH CBT TO CLASS & SESSION WITH SCHEDULING */}
      {distributeModal && (
        <div className="modal-overlay" onClick={() => setDistributeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '560px', width: '92%', borderRadius: '20px', padding: '24px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>publish</span>
                Terbitkan & Atur Jadwal Ujian CBT
              </h3>
              <button onClick={() => setDistributeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>{distributeModal.targetExam.title}</strong>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Atur target kelas, nomor sesi, serta jadwal aktif pengerjaan untuk kelas ini.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Target Kelas *</label>
                <select
                  value={targetClassForDistribute}
                  onChange={(e) => setTargetClassForDistribute(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                >
                  {classes.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name || c.class_name}</option>
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

              <div>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', display: 'block', marginBottom: '4px' }}>Waktu Mulai Ujian</label>
                <input
                  type="datetime-local"
                  value={distributeStartTime}
                  onChange={(e) => setDistributeStartTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', display: 'block', marginBottom: '4px' }}>Waktu Selesai Ujian</label>
                <input
                  type="datetime-local"
                  value={distributeEndTime}
                  onChange={(e) => setDistributeEndTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <input
                type="checkbox"
                id="distributeHideCorrectAnswers"
                checked={distributeHideCorrectAnswers}
                onChange={(e) => setDistributeHideCorrectAnswers(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="distributeHideCorrectAnswers" style={{ fontSize: '11px', fontWeight: '800', cursor: 'pointer', margin: 0 }}>
                Sembunyikan Kunci Jawaban & Pembahasan Ujian untuk kelas ini
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDistributeModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
              <button
                onClick={handlePublishCbtToClassSession}
                disabled={distributing}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                {distributing ? 'Menerbitkan...' : 'Terbitkan Ujian ke Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruCbt;
