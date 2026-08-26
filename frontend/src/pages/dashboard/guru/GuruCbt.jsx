import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-cbt.css';

const GuruCbt = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab State: 'master' (Bank Soal Master) | 'distributed' (Ujian Kelas Terdistribusi)
  const [activeTab, setActiveTab] = useState('master');

  // Dropdown Data Actions State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const wordFileInputRef = useRef(null);
  const modalWordFileInputRef = useRef(null);

  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Create & Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);

  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passScore, setPassScore] = useState(75);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [examType, setExamType] = useState('quiz');
  const [hideCorrectAnswers, setHideCorrectAnswers] = useState(true);

  // Question Form State
  const [questions, setQuestions] = useState([
    { question_text: '', type: 'pg', options: ['', '', '', ''], correct_option: 0, correct_tf: true, matching_pairs: [], explanation: '' }
  ]);

  // Results Modal State
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Distribute Modal State
  const [distributeModal, setDistributeModal] = useState(null);
  const [targetClassForDistribute, setTargetClassForDistribute] = useState('');
  const [distributeStartTime, setDistributeStartTime] = useState('');
  const [distributeEndTime, setDistributeEndTime] = useState('');
  const [distributeHideCorrectAnswers, setDistributeHideCorrectAnswers] = useState(true);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    fetchExams(true);
    fetchSubjectsAndClasses();
    fetchTeacherProfile();
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

  const fetchExams = async (showFullLoader = false) => {
    try {
      if (showFullLoader) setLoading(true);
      const res = await api.get('/cbt/exams');
      if (res.data.success) {
        setExams(res.data.exams || []);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('Gagal memuat daftar Ujian CBT.');
    } finally {
      if (showFullLoader) setLoading(false);
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
    } catch (err) {
      console.error('Error fetching master subjects/classes:', err);
    }
  };

  const fetchTeacherProfile = async () => {
    try {
      const res = await api.get('/profile');
      setTeacherSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Error fetching teacher profile:', err);
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
          setSuccess(`Berhasil mengimpor ${importedQuestions.length} soal dari Excel ke form kuis.`);
        } else {
          const cleanFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const defaultSub = teacherSubjects.length > 0 
            ? teacherSubjects[0]._id 
            : (subjects.length > 0 ? (subjects[0]._id || subjects[0].id) : '');

          const payload = {
            title: `Bank Soal: ${cleanFileName}`,
            subject: defaultSub,
            duration_minutes: 30,
            pass_score: 75,
            is_active: true,
            is_master: true,
            questions: importedQuestions
          };

          const saveRes = await api.post('/cbt/exams', payload);
          if (saveRes.data.success) {
            setSuccess(`Berhasil mengimpor & langsung menyimpan ${importedQuestions.length} soal dari Excel ke Paket Ujian: "${cleanFileName}".`);
            fetchExams(false);
          } else {
            throw new Error('Gagal menyimpan otomatis ke database');
          }
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

  const handleImportWordClick = () => {
    setDropdownOpen(false);
    if (wordFileInputRef.current) wordFileInputRef.current.click();
  };

  const handleModalImportWordClick = () => {
    if (modalWordFileInputRef.current) modalWordFileInputRef.current.click();
  };

  const handleWordFileChange = async (e, isModal = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImportLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/cbt/import-questions-word', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const importedQuestions = response.data.questions || [];

        if (isModal || showCreateModal) {
          setQuestions((prev) => [...prev.filter(q => q.question_text.trim() !== ''), ...importedQuestions]);
          setSuccess(`Berhasil mengimpor ${importedQuestions.length} soal dari Word (.docx) ke form kuis.`);
        } else {
          const cleanFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const defaultSub = teacherSubjects.length > 0 
            ? teacherSubjects[0]._id 
            : (subjects.length > 0 ? (subjects[0]._id || subjects[0].id) : '');

          const payload = {
            title: `Bank Soal: ${cleanFileName}`,
            subject: defaultSub,
            duration_minutes: 30,
            pass_score: 75,
            is_active: true,
            is_master: true,
            questions: importedQuestions
          };

          const saveRes = await api.post('/cbt/exams', payload);
          if (saveRes.data.success) {
            setSuccess(`Berhasil mengimpor & langsung menyimpan ${importedQuestions.length} soal dari Word (.docx) ke Paket Ujian: "${cleanFileName}".`);
            fetchExams(false);
          } else {
            throw new Error('Gagal menyimpan otomatis ke database');
          }
        }
      }
    } catch (err) {
      console.error('Error importing Word:', err);
      setError(err.response?.data?.message || 'Gagal mengimpor file Word.');
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
      { question_text: '', type: 'pg', options: ['', '', '', ''], correct_option: 0, correct_tf: true, matching_pairs: [], explanation: '' }
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

  const handleQuestionTypeChange = (qIdx, typeValue) => {
    const updated = [...questions];
    updated[qIdx].type = typeValue;
    if (typeValue === 'essay') {
      updated[qIdx].options = [];
      updated[qIdx].correct_option = 0;
      updated[qIdx].correct_answer_text = updated[qIdx].correct_answer_text || '';
    } else if (typeValue === 'pg') {
      updated[qIdx].options = ['', '', '', ''];
      updated[qIdx].correct_option = 0;
    } else if (typeValue === 'tf') {
      updated[qIdx].correct_tf = true;
    } else if (typeValue === 'matching') {
      if(!updated[qIdx].matching_pairs) updated[qIdx].matching_pairs = [];
    }
    setQuestions(updated);
  };

  const handleCorrectAnswerTextChange = (qIdx, value) => {
    const updated = [...questions];
    updated[qIdx].correct_answer_text = value;
    setQuestions(updated);
  };

  const formatToLocalDatetimeInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    
    // Format to Asia/Jakarta timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(d);
    const getVal = (type) => parts.find(p => p.type === type)?.value || '';
    
    const year = getVal('year');
    const month = getVal('month');
    const day = getVal('day');
    const hour = getVal('hour');
    const minute = getVal('minute');
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingExamId(null);
    setTitle('');
    if (subjects.length > 0) setSelectedSubject(subjects[0]._id || subjects[0].id);
    setDurationMinutes(30);
    setPassScore(75);
    setStartTime('');
    setEndTime('');
    setExamType('quiz');
    setHideCorrectAnswers(true);
    setQuestions([{ question_text: '', type: 'pg', options: ['', '', '', ''], correct_option: 0, correct_tf: true, matching_pairs: [], explanation: '' }]);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (exam) => {
    setIsEditing(true);
    setEditingExamId(exam._id);
    setTitle(exam.title);
    setSelectedSubject(exam.subject?._id || exam.subject || '');
    setDurationMinutes(exam.duration_minutes);
    setPassScore(exam.pass_score);
    setStartTime(formatToLocalDatetimeInput(exam.start_time));
    setEndTime(formatToLocalDatetimeInput(exam.end_time));
    setExamType(exam.exam_type || 'quiz');
    setHideCorrectAnswers(exam.hide_correct_answers !== undefined ? exam.hide_correct_answers : true);
    setQuestions(exam.questions && exam.questions.length > 0 ? exam.questions : [
      { question_text: '', type: 'pg', options: ['', '', '', ''], correct_option: 0, correct_tf: true, matching_pairs: [], explanation: '' }
    ]);
    setShowCreateModal(true);
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
      if (q.type !== 'essay') {
        for (let j = 0; j < 4; j++) {
          if (!q.options || !q.options[j] || !q.options[j].trim()) {
            setError(`Pilihan jawaban ${String.fromCharCode(65 + j)} pada soal nomor ${i + 1} belum diisi.`);
            return;
          }
        }
      }
    }

    try {
      const payload = {
        title: title.trim(),
        subject: selectedSubject,
        duration_minutes: Number(durationMinutes),
        pass_score: Number(passScore),
        is_active: true,
        is_master: activeTab === 'master', // Match currently active tab as creator target
        exam_type: examType,
        start_time: startTime || null,
        end_time: endTime || null,
        hide_correct_answers: hideCorrectAnswers,
        questions
      };

      if (isEditing) {
        const res = await api.put(`/cbt/exams/${editingExamId}`, payload);
        if (res.data.success) {
          setSuccess('Paket Ujian CBT berhasil diperbarui.');
          setShowCreateModal(false);
          fetchExams(false);
        }
      } else {
        const res = await api.post('/cbt/exams', payload);
        if (res.data.success) {
          setSuccess('Paket Ujian CBT berhasil dibuat.');
          setShowCreateModal(false);
          fetchExams(false);
        }
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
        fetchExams(false);
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
        fetchExams(false);
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
    setDistributeStartTime(formatToLocalDatetimeInput(exam.start_time));
    setDistributeEndTime(formatToLocalDatetimeInput(exam.end_time));
    setDistributeHideCorrectAnswers(exam.hide_correct_answers !== undefined ? exam.hide_correct_answers : true);
  };

  const handlePublishCbtToClassSession = async () => {
    if (!distributeModal || !distributeModal.targetExam) return;
    setDistributing(true);
    try {
      const targetClass = targetClassForDistribute || (classes[0]?._id || classes[0]?.id || '8B');
      await api.post('/cbt/distribute', {
        master_exam_id: distributeModal.targetExam._id,
        class_id: targetClass,
        session_number: 1, // Defaulting session number to 1 as requested
        duration_minutes: distributeModal.targetExam.duration_minutes,
        pass_score: distributeModal.targetExam.pass_score,
        start_time: distributeStartTime || null,
        end_time: distributeEndTime || null,
        hide_correct_answers: distributeHideCorrectAnswers
      });
      alert(`Berhasil mendistribusikan Ujian CBT "${distributeModal.targetExam.title}" ke kelas tujuan.`);
      setDistributeModal(null);
      fetchExams(false);
    } catch (err) {
      console.error('Error distributing CBT:', err);
      alert(err.response?.data?.message || 'Gagal mendistribusikan Ujian CBT.');
    } finally {
      setDistributing(false);
    }
  };

  if (loading) return <div className="cbt-guru-loading">Memuat Manajemen Ujian CBT...</div>;

  // Filter exams based on active tab
  const masterExams = exams.filter(e => e.is_master);
  const distributedExams = exams.filter(e => !e.is_master);

  return (
    <div className="guru-cbt-container">
      {/* Hidden File Input for Main Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            if (file.name.endsWith('.docx')) {
              handleWordFileChange(e, false);
            } else {
              handleExcelFileChange(e, false);
            }
          }
        }}
        accept=".xlsx, .xls, .docx"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={modalFileInputRef}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            if (file.name.endsWith('.docx')) {
              handleWordFileChange(e, true);
            } else {
              handleExcelFileChange(e, true);
            }
          }
        }}
        accept=".xlsx, .xls, .docx"
        style={{ display: 'none' }}
      />
      {/* Hidden File Inputs for Word Import */}
      <input
        type="file"
        ref={wordFileInputRef}
        onChange={(e) => handleWordFileChange(e, false)}
        accept=".docx"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={modalWordFileInputRef}
        onChange={(e) => handleWordFileChange(e, true)}
        accept=".docx"
        style={{ display: 'none' }}
      />

      {/* Header Bar */}
      <div className="guru-cbt-header">
        <div>
          <h1 className="page-title">Manajemen Ujian CBT (Computer Based Test)</h1>
          <p className="page-subtitle">Buat bank soal master CBT, distribusikan ke kelas ujian, dan kelola nilai rekapitulasi siswa.</p>
        </div>

        {/* Action Buttons */}
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
                    {importLoading ? 'Memproses...' : 'Import Soal (.xlsx / .docx)'}
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

          <button className="btn-create-exam" onClick={handleOpenCreate}>
            <span className="material-symbols-outlined">add</span> Buat Ujian CBT Baru
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {success && <div className="alert-box success">{success}</div>}

      {/* TABS SEPARATION */}
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
          <span className="material-symbols-outlined">database</span> Bank Soal Master CBT ({masterExams.length})
        </button>
        <button
          onClick={() => setActiveTab('distributed')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'distributed' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'distributed' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">assignment_turned_in</span> Distribusi Ujian Kelas ({distributedExams.length})
        </button>
      </div>

      {/* EXAMS LIST TABLE BY TAB */}
      <div className="exams-table-container">
        <table className="guru-cbt-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Judul Ujian</th>
              <th>Mata Pelajaran</th>
              {activeTab === 'distributed' && <th>Kelas Tujuan</th>}
              <th>Durasi / KKM</th>
              <th>Waktu Aktif</th>
              <th>Pertanyaan</th>
              <th>Aksi Ujian</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'master' ? masterExams : distributedExams).length > 0 ? (
              (activeTab === 'master' ? masterExams : distributedExams).map((exam) => (
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
                  {activeTab === 'distributed' && <td className="text-center font-bold" style={{ color: '#0284c7' }}>{exam.class_name || 'Semua Kelas'}</td>}
                  <td>
                    <div style={{ fontSize: '12px' }}>⏱️ {exam.duration_minutes} Menit</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>🎯 KKM: {exam.pass_score}</div>
                  </td>
                  <td style={{ fontSize: '11px', color: '#334155' }}>
                    {exam.start_time && exam.end_time ? (
                      <div>
                        <div>📅 {new Date(exam.start_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })}</div>
                        <div>s/d {new Date(exam.end_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Selalu Aktif</span>
                    )}
                  </td>
                  <td className="text-center font-bold">{exam.total_questions || exam.questions?.length || 0} Soal</td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {exam.is_master && (
                        <button
                          className="btn-action distribute"
                          onClick={() => handleOpenDistribute(exam)}
                          title="Distribusikan Ujian ke Kelas"
                          style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>publish</span>
                          Distribusikan
                        </button>
                      )}
                      <button
                        className="btn-action results"
                        onClick={() => handleViewResults(exam)}
                        title="Lihat Nilai Siswa"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>analytics</span>
                        Nilai
                      </button>
                      <button
                        className="btn-action edit"
                        onClick={() => handleOpenEdit(exam)}
                        title="Edit Soal & Detail Ujian"
                        style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: '700', fontSize: '12px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                        Edit
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => handleDeleteExam(exam._id)}
                        title="Hapus Ujian"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={activeTab === 'distributed' ? 9 : 8} className="text-center empty-table">
                  {activeTab === 'master'
                    ? 'Belum ada paket Bank Soal Master CBT. Silakan buat atau import dari Excel.'
                    : 'Belum ada ujian master CBT yang didistribusikan ke kelas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE & EDIT CBT EXAM MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? 'Edit Detail & Soal Ujian CBT' : 'Buat Paket Ujian CBT Baru'}</h2>
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

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Jenis Ujian *</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="form-select"
                  >
                    <option value="quiz">Ulangan Harian (UH)</option>
                    <option value="uts">Ujian Tengah Semester (UTS)</option>
                    <option value="uas">Ujian Akhir Semester (UAS)</option>
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
                <div className="questions-section-header">
                  <h3>Daftar Soal Ujian ({questions.length})</h3>
                  <div className="q-header-buttons" style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn-import-excel-modal" onClick={handleModalImportClick} style={{ color: '#0f766e', borderColor: '#5eead4' }}>
                      <span className="material-symbols-outlined" style={{ color: '#0f766e' }}>upload_file</span> Import Soal
                    </button>
                    <button type="button" className="btn-add-q" onClick={handleAddQuestion}>
                      + Tambah Soal
                    </button>
                  </div>
                </div>

                <div className="questions-list-form" style={{ marginTop: '14px' }}>
                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="question-item-card" style={{ marginBottom: '14px' }}>
                      <div className="q-card-header">
                        <span className="q-number">Nomor Soal #{qIdx + 1}</span>
                  {questions.length > 1 && (
                          <button type="button" className="btn-delete-q" onClick={() => handleRemoveQuestion(qIdx)} title="Hapus Soal">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group">
                          <label>Tipe Pertanyaan</label>
                          <select
                            value={q.type || 'pg'}
                            onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value)}
                            className="form-select"
                          >
                            <option value="pg">Pilihan Ganda (PG)</option>
                            <option value="tf">Benar / Salah</option>
                            <option value="matching">Menjodohkan</option>
                            <option value="essay">Essay / Uraian</option>
                          </select>
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
                      </div>

                      {q.type === 'essay' ? (
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label>Kunci Jawaban Ideal / Alternatif Jawaban Essay (Opsional)</label>
                          <textarea
                            rows={2}
                            placeholder="Tuliskan kata kunci atau contoh jawaban yang benar..."
                            value={q.correct_answer_text || ''}
                            onChange={(e) => handleCorrectAnswerTextChange(qIdx, e.target.value)}
                            className="form-input"
                            style={{ fontFamily: 'inherit', padding: '8px' }}
                          />
                        </div>
                      ) : q.type === 'tf' ? (
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label>Kunci Jawaban</label>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="radio" checked={q.correct_tf === true} onChange={() => {
                                const updated = [...questions];
                                updated[qIdx].correct_tf = true;
                                setQuestions(updated);
                              }} /> Benar
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="radio" checked={q.correct_tf === false} onChange={() => {
                                const updated = [...questions];
                                updated[qIdx].correct_tf = false;
                                setQuestions(updated);
                              }} /> Salah
                            </label>
                          </div>
                        </div>
                      ) : q.type === 'matching' ? (
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label>Pasangan Jawaban (Kiri = Premis, Kanan = Jawaban)</label>
                            <button type="button" onClick={() => {
                              const updated = [...questions];
                              if(!updated[qIdx].matching_pairs) updated[qIdx].matching_pairs = [];
                              updated[qIdx].matching_pairs.push({ left: '', right: '' });
                              setQuestions(updated);
                            }} style={{ background: '#e2e8f0', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Pasangan</button>
                          </div>
                          {(q.matching_pairs || []).map((pair, pIdx) => (
                            <div key={pIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                              <input type="text" placeholder="Premis Kiri" value={pair.left} onChange={e => {
                                const updated = [...questions];
                                updated[qIdx].matching_pairs[pIdx].left = e.target.value;
                                setQuestions(updated);
                              }} className="form-input" style={{ flex: 1 }} />
                              <input type="text" placeholder="Jawaban Kanan" value={pair.right} onChange={e => {
                                const updated = [...questions];
                                updated[qIdx].matching_pairs[pIdx].right = e.target.value;
                                setQuestions(updated);
                              }} className="form-input" style={{ flex: 1 }} />
                              <button type="button" onClick={() => {
                                const updated = [...questions];
                                updated[qIdx].matching_pairs = updated[qIdx].matching_pairs.filter((_, i) => i !== pIdx);
                                setQuestions(updated);
                              }} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', padding: '0 10px' }}>X</button>
                            </div>
                          ))}
                          {(!q.matching_pairs || q.matching_pairs.length === 0) && (
                            <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '11px' }}>Tambahkan setidaknya 1 pasangan.</div>
                          )}
                        </div>
                      ) : (
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
                                value={q.options && q.options[oIdx] !== undefined ? q.options[oIdx] : ''}
                                onChange={(e) => handleOptionTextChange(qIdx, oIdx, e.target.value)}
                                className="form-input opt-input"
                              />
                            </div>
                          ))}
                        </div>
                      )}

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
              </div>

              <div className="form-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-submit-exam" style={{ background: '#16a34a' }}>
                  {isEditing ? 'Simpan Perubahan' : 'Simpan & Publikasikan Ujian'}
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
                            {new Date(resItem.submitted_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
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

      {/* POPUP DISTRIBUTE / PUBLISH CBT TO CLASS WITH SCHEDULING */}
      {distributeModal && (
        <div className="modal-overlay" onClick={() => setDistributeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="modal-content-cbt-form" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '560px', width: '92%', borderRadius: '20px', padding: '24px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>publish</span>
                Distribusikan Ujian CBT Ke Kelas
              </h3>
              <button onClick={() => setDistributeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>{distributeModal.targetExam.title}</strong>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Pilih target kelas dan atur waktu pengerjaan untuk mendistribusikan ujian.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
                {distributing ? 'Mendistribusikan...' : 'Distribusikan Ujian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruCbt;
