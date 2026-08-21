import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-assignments.css';

const GuruAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedSubmissionModal, setSelectedSubmissionModal] = useState(null);

  // Pagination for Student Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    class_id: '',
    description: '',
    deadline: '',
    kkm: 70,
    attachments: [],
    max_score: 100,
    assignment_type: 'upload',
    questions: []
  });

  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeacherProfile();
    fetchAssignments();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const res = await api.get('/profile');
      setTeacherSubjects(res.data.subjects || []);
      setTeacherClasses(res.data.classes || []);
    } catch (err) {
      console.error('Gagal ambil profil guru', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments/guru/me');
      const fetchedAssignments = res.data.data || [];
      setAssignments(fetchedAssignments);

      if (fetchedAssignments.length > 0 && !selectedAssignment) {
        handleSelectAssignment(fetchedAssignments[0]);
      }
    } catch (err) {
      console.error('Gagal ambil tugas', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionsAndStudents = async (assignment) => {
    try {
      const assignmentId = assignment._id;
      const classId = assignment.class || assignment.class_id;

      const [subRes, studentsRes] = await Promise.all([
        api.get(`/assignments/${assignmentId}/submissions`).catch(() => ({ data: { data: [] } })),
        api.get(`/attendance/students/${classId}`).catch(() => ({ data: { students: [] } }))
      ]);

      const fetchedSubmissions = subRes.data?.data || [];
      const classStudents = studentsRes.data?.students || [];

      const submissionMap = {};
      fetchedSubmissions.forEach(sub => {
        const sId = sub.student_id ? sub.student_id.toString() : '';
        if (sId) submissionMap[sId] = sub;
      });

      let mergedSubmissions = [];

      if (classStudents.length > 0) {
        mergedSubmissions = classStudents.map(st => {
          const stId = (st._id || st.id).toString();
          const existingSub = submissionMap[stId];

          if (existingSub) {
            return {
              ...existingSub,
              student_id: stId,
              student_name: st.full_name || existingSub.student_name,
              nis: st.nis || '-',
              isSubmitted: true
            };
          } else {
            return {
              student_id: stId,
              student_name: st.full_name,
              nis: st.nis || '-',
              submitted_at: null,
              file: null,
              link: null,
              content: null,
              score: null,
              feedback: '',
              isSubmitted: false
            };
          }
        });
      } else {
        mergedSubmissions = fetchedSubmissions.map(sub => ({
          ...sub,
          isSubmitted: true
        }));
      }

      setSubmissions(mergedSubmissions);
      setCurrentPage(1); // Reset to first page when changing assignment

      const initialGrades = {};
      const initialFeedbacks = {};
      mergedSubmissions.forEach(sub => {
        if (sub.score !== null && sub.score !== undefined) {
          initialGrades[sub.student_id] = sub.score;
        } else if (assignment.assignment_type === 'structured' && sub.pilgan_score !== undefined) {
          // Prepopulate with auto-graded pilgan score if the final score is not yet set
          initialGrades[sub.student_id] = sub.pilgan_score;
        } else {
          initialGrades[sub.student_id] = '';
        }
        initialFeedbacks[sub.student_id] = sub.feedback || '';
      });

      setGrades(initialGrades);
      setFeedbacks(initialFeedbacks);
    } catch (err) {
      console.error('Gagal ambil data submisi & siswa:', err);
    }
  };

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    fetchSubmissionsAndStudents(assignment);
    setShowCreateForm(false);
    setEditMode(false);
    setSelectedSubmissionModal(null);
  };

  const handleEdit = (assignment, e) => {
    e.stopPropagation();
    setEditingAssignment(assignment);
    setEditMode(true);
    setFormData({
      title: assignment.title,
      subject_id: assignment.subject,
      class_id: assignment.class,
      description: assignment.description || '',
      deadline: assignment.deadline ? assignment.deadline.slice(0, 16) : '',
      kkm: assignment.kkm || 70,
      attachments: assignment.attachments || [],
      max_score: assignment.max_score || 100,
      assignment_type: assignment.assignment_type || 'upload',
      questions: assignment.questions || []
    });
    setShowCreateForm(true);
    setSelectedAssignment(null);
  };

  const handleDeleteAssignment = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Yakin ingin menghapus tugas ini? Semua data submisi dan nilai akan hilang!')) {
      try {
        await api.delete(`/assignments/${id}`);
        alert('Tugas berhasil dihapus');
        fetchAssignments();
        if (selectedAssignment && selectedAssignment._id === id) {
          setSelectedAssignment(null);
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus tugas');
      }
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddAttachment = () => {
    setFormData({
      ...formData,
      attachments: [...formData.attachments, { type: 'file', value: null }]
    });
  };

  const handleAttachmentTypeChange = (index, type) => {
    const newAttachments = [...formData.attachments];
    newAttachments[index].type = type;
    newAttachments[index].value = type === 'link' ? '' : null;
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleAttachmentFileChange = (index, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }
    const newAttachments = [...formData.attachments];
    newAttachments[index].value = file;
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleAttachmentLinkChange = (index, link) => {
    const newAttachments = [...formData.attachments];
    newAttachments[index].value = link;
    setFormData({ ...formData, attachments: newAttachments });
  };

  const removeAttachment = (index) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('subject_id', formData.subject_id);
    data.append('class_id', formData.class_id);
    data.append('description', formData.description);
    data.append('deadline', formData.deadline);
    data.append('kkm', formData.kkm);
    data.append('max_score', formData.max_score);
    data.append('assignment_type', formData.assignment_type);
    data.append('questions', JSON.stringify(formData.questions));

    formData.attachments.forEach((att) => {
      if (att.type === 'file' && att.value instanceof File) {
        data.append('files', att.value);
      } else if (att.type === 'link' && att.value) {
        data.append('links', att.value);
      }
    });

    try {
      if (editMode) {
        await api.put(`/assignments/${editingAssignment._id}`, data);
        alert('Tugas berhasil diperbarui');
      } else {
        await api.post('/assignments', data);
        alert('Tugas berhasil dibuat');
      }
      setShowCreateForm(false);
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tugas');
    }
  };

  const handleGradeChange = (studentId, score) => {
    setGrades({ ...grades, [studentId]: score });
  };

  const handleFeedbackChange = (studentId, feedback) => {
    setFeedbacks({ ...feedbacks, [studentId]: feedback });
  };

  const handleSaveGrades = async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      const isExpired = new Date(selectedAssignment.deadline) < new Date();

      const gradesList = Object.keys(grades)
        .filter(studentId => {
          const sub = submissions.find(s => s.student_id === studentId);
          if (!sub || (!sub.isSubmitted && isExpired)) return false;
          return grades[studentId] !== '';
        })
        .map(studentId => ({
          student_id: studentId,
          score: Number(grades[studentId]),
          feedback: feedbacks[studentId] || ''
        }));

      if (gradesList.length === 0) {
        alert('Belum ada nilai baru yang diisi untuk siswa yang berhak dinilai.');
        setSaving(false);
        return;
      }

      await api.post(`/assignments/${selectedAssignment._id}/grades`, { grades: gradesList });
      alert('Nilai tugas berhasil disimpan!');
      fetchSubmissionsAndStudents(selectedAssignment);
      fetchAssignments();
    } catch (err) {
      console.error('Gagal simpan nilai:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan nilai');
    } finally {
      setSaving(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const deadline = new Date(assignment.deadline);
    const now = new Date();
    if (now > deadline) return 'completed';
    return 'active';
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'active') return getAssignmentStatus(a) === 'active';
    if (filter === 'completed') return getAssignmentStatus(a) === 'completed';
    return true;
  });

  const isSelectedAssignmentExpired = selectedAssignment ? new Date(selectedAssignment.deadline) < new Date() : false;
  const submittedCount = submissions.filter(s => s.isSubmitted).length;
  const gradedCount = submissions.filter(s => s.isSubmitted && s.score !== null && s.score !== '' && s.score !== undefined).length;
  const ungradedCount = submissions.filter(s => s.isSubmitted && (s.score === null || s.score === '' || s.score === undefined)).length;
  const notSubmittedCount = submissions.filter(s => !s.isSubmitted).length;

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubmissions = submissions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(submissions.length / itemsPerPage);

  if (loading) return <div className="guru-assignments-container"><div className="loading">Memuat data tugas...</div></div>;

  return (
    <div className="guru-assignments-container">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Penugasan & Latihan Kelas</h1>
          <p>Kelola lembar tugas, instruksi pengerjaan, dan evaluasi hasil belajar siswa sekelas.</p>
        </div>
        <button className="btn-create" onClick={() => { setShowCreateForm(true); setEditMode(false); setSelectedAssignment(null); }}>
          <span className="material-symbols-outlined">add</span> Buat Tugas Baru
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Tugas ({assignments.length})</button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Aktif</button>
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Selesai</button>
      </div>

      <div className="main-layout">
        
        {/* LEFT COLUMN: Daftar Tugas */}
        <div className="assignments-list">
          {filteredAssignments.length === 0 && <div className="empty-card">Belum ada tugas dalam daftar ini.</div>}
          {filteredAssignments.map(assignment => {
            const status = getAssignmentStatus(assignment);
            const isSelected = selectedAssignment?._id === assignment._id;
            const submCount = assignment.submitted_count || 0;
            const grdCount = assignment.graded_count || 0;

            return (
              <div 
                key={assignment._id} 
                className={`assignment-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectAssignment(assignment)}
              >
                <div className="card-icon">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div className="card-content">
                  <h3>{assignment.title}</h3>
                  <div className="meta">
                    <span className="badge-sub">{assignment.subject_name || 'Mapel'}</span>
                    <span className="badge-cls">{assignment.class_name || 'Kelas'}</span>
                  </div>
                  <div className="deadline">
                    <span className="material-symbols-outlined icon">event_busy</span>
                    Deadline: {new Date(assignment.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>

                  {/* TEKS PROGRES DISAMPING STATUS (BUKAN DIATASNYA) SESUAI REQUEST USER */}
                  <div className="card-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <div className={`status ${status}`}>
                      {status === 'active' ? 'Aktif' : 'Selesai'}
                    </div>
                    <div className="card-progress-text" style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                      Mengumpulkan: {submCount} • Dinilai: {grdCount}
                    </div>
                  </div>
                </div>

                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-edit" onClick={(e) => handleEdit(assignment, e)}>Edit</button>
                  <button className="btn-delete" onClick={(e) => handleDeleteAssignment(e, assignment._id)}>Hapus</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Detail Isi Tugas & Tabel Submisi Full 1 Kelas */}
        <div className="assignment-detail">
          {showCreateForm ? (
            <div className="create-form-card">
              <h2>{editMode ? 'Edit Tugas Kelas' : 'Buat Tugas Baru'}</h2>
              <form onSubmit={handleSubmitAssignment}>
                <div className="form-group">
                  <label>Judul Tugas</label>
                  <input name="title" placeholder="Contoh: Tugas 1 — Algoritma & Pemrograman" value={formData.title} onChange={handleFormChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mata Pelajaran</label>
                    <select name="subject_id" value={formData.subject_id} onChange={handleFormChange} required>
                      <option value="">Pilih Mapel</option>
                      {teacherSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kelas Target</label>
                    <select name="class_id" value={formData.class_id} onChange={handleFormChange}>
                      <option value="">Umum / Draf (Belum Didistribusikan)</option>
                      {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Tipe Pengumpulan Tugas</label>
                  <select 
                    name="assignment_type" 
                    value={formData.assignment_type || 'upload'} 
                    onChange={handleFormChange}
                  >
                    <option value="upload">Biasa (Upload File / Teks Bebas)</option>
                    <option value="structured">Terstruktur (Form Soal Pilihan Ganda & Uraian)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Deskripsi / Instruksi Pengerjaan Tugas</label>
                  <textarea name="description" rows="5" placeholder="Tuliskan petunjuk pengerjaan tugas secara rinci..." value={formData.description} onChange={handleFormChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Deadline (Tanggal & Jam)</label>
                    <input type="datetime-local" name="deadline" value={formData.deadline} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label>Nilai KKM</label>
                    <input type="number" name="kkm" value={formData.kkm} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label>Nilai Maksimal</label>
                    <input type="number" name="max_score" value={formData.max_score} onChange={handleFormChange} />
                  </div>
                </div>

                {formData.assignment_type === 'structured' && (
                  <div className="questions-builder-section">
                    <h4 className="questions-builder-title">
                      <span className="material-symbols-outlined">quiz</span>
                      Daftar Soal Terstruktur
                    </h4>
                    {formData.questions?.map((q, qIndex) => (
                      <div key={qIndex} className="question-card">
                        <div className="question-header">
                          <strong className="question-number">Soal #{qIndex + 1}</strong>
                          <button type="button" className="btn-remove-question" onClick={() => {
                            const newQ = [...formData.questions];
                            newQ.splice(qIndex, 1);
                            setFormData({...formData, questions: newQ});
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                            Hapus Soal
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Tipe Soal</label>
                            <select 
                              value={q.question_type}
                              onChange={(e) => {
                                const newQ = [...formData.questions];
                                newQ[qIndex].question_type = e.target.value;
                                setFormData({...formData, questions: newQ});
                              }}
                            >
                              <option value="pilgan">Pilihan Ganda (Auto-Grade)</option>
                              <option value="essay">Uraian Singkat / Essay</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Bobot Nilai</label>
                            <input 
                              type="number" 
                              value={q.points}
                              onChange={(e) => {
                                const newQ = [...formData.questions];
                                newQ[qIndex].points = Number(e.target.value);
                                setFormData({...formData, questions: newQ});
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Pertanyaan</label>
                          <textarea 
                            rows="2" 
                            value={q.text}
                            onChange={(e) => {
                              const newQ = [...formData.questions];
                              newQ[qIndex].text = e.target.value;
                              setFormData({...formData, questions: newQ});
                            }}
                            placeholder="Tuliskan pertanyaan disini..."
                          />
                        </div>

                        {q.question_type === 'pilgan' && (
                          <div className="options-section">
                            <label>Opsi Jawaban & Kunci (Pilih radio button untuk set kunci)</label>
                            {['A', 'B', 'C', 'D'].map((optLabel, optIdx) => (
                              <div key={optIdx} className="option-row">
                                <input 
                                  type="radio" 
                                  name={`correct_${qIndex}`} 
                                  className="option-radio"
                                  checked={q.correct_answer === q.options?.[optIdx]}
                                  onChange={() => {
                                    const newQ = [...formData.questions];
                                    newQ[qIndex].correct_answer = newQ[qIndex].options[optIdx];
                                    setFormData({...formData, questions: newQ});
                                  }}
                                />
                                <span className="option-label">{optLabel}.</span>
                                <input 
                                  type="text" 
                                  className="option-input"
                                  value={q.options?.[optIdx] || ''}
                                  onChange={(e) => {
                                    const newQ = [...formData.questions];
                                    if(!newQ[qIndex].options) newQ[qIndex].options = ['', '', '', ''];
                                    newQ[qIndex].options[optIdx] = e.target.value;
                                    setFormData({...formData, questions: newQ});
                                  }}
                                  placeholder={`Teks opsi ${optLabel}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <button 
                      type="button" 
                      className="btn-add-question"
                      onClick={() => setFormData({
                        ...formData, 
                        questions: [...(formData.questions||[]), { question_type: 'pilgan', text: '', options: ['', '', '', ''], correct_answer: '', points: 10 }]
                      })}
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      Tambah Soal
                    </button>
                  </div>
                )}

                <div className="form-group attachments-group">
                  <label>Lampiran Tugas (File PDF/Gambar atau Tautan URL)</label>
                  {formData.attachments.map((att, idx) => (
                    <div key={idx} className="attachment-row">
                      <select value={att.type} onChange={(e) => handleAttachmentTypeChange(idx, e.target.value)}>
                        <option value="file">File (Max 5MB)</option>
                        <option value="link">Tautan Link URL</option>
                      </select>
                      {att.type === 'file' ? (
                        <input type="file" onChange={(e) => handleAttachmentFileChange(idx, e.target.files[0])} />
                      ) : (
                        <input type="url" placeholder="https://..." value={att.value || ''} onChange={(e) => handleAttachmentLinkChange(idx, e.target.value)} />
                      )}
                      <button type="button" className="remove-btn" onClick={() => removeAttachment(idx)}>Hapus</button>
                    </div>
                  ))}
                  <button type="button" className="add-attachment" onClick={handleAddAttachment}>+ Tambah Lampiran File/Link</button>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowCreateForm(false)}>Batal</button>
                  <button type="submit" className="btn-submit">Simpan Tugas</button>
                </div>
              </form>
            </div>
          ) : selectedAssignment ? (
            <div className="detail-container">
              
              {/* DETAIL ISI TUGAS CARD */}
              <div className="task-detail-card">
                <div className="task-detail-header">
                  <div>
                    <span className="task-subject-tag">{selectedAssignment.subject_name || 'Mata Pelajaran'} • {selectedAssignment.class_name || 'Kelas'}</span>
                    <h2 className="task-title">{selectedAssignment.title}</h2>
                  </div>
                  <div className="task-actions-top">
                    <button className="btn-edit-top" onClick={(e) => handleEdit(selectedAssignment, e)}>
                      <span className="material-symbols-outlined">edit</span> Edit Tugas
                    </button>
                  </div>
                </div>

                <div className="task-meta-grid">
                  <div className="meta-pill">
                    <span className="material-symbols-outlined icon">event</span>
                    <div>
                      <span className="lbl">Deadline</span>
                      <span className="val">{new Date(selectedAssignment.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                  <div className="meta-pill">
                    <span className="material-symbols-outlined icon">grade</span>
                    <div>
                      <span className="lbl">KKM / Maks</span>
                      <span className="val">{selectedAssignment.kkm || 70} / {selectedAssignment.max_score || 100}</span>
                    </div>
                  </div>
                  <div className="meta-pill">
                    <span className="material-symbols-outlined icon">groups</span>
                    <div>
                      <span className="lbl">Total Siswa Sekelas</span>
                      <span className="val">{submissions.length} Siswa</span>
                    </div>
                  </div>
                </div>

                {/* Deskripsi & Instruksi Pengerjaan Tugas */}
                <div className="task-description-box">
                  <h4 className="desc-title">
                    <span className="material-symbols-outlined">description</span>
                    Instruksi & Detail Isi Tugas:
                  </h4>
                  <p className="desc-text">
                    {selectedAssignment.description || 'Tidak ada deskripsi tambahan untuk tugas ini.'}
                  </p>
                </div>

                {/* Tampilan Preview Soal Terstruktur untuk Guru */}
                {selectedAssignment.assignment_type === 'structured' && selectedAssignment.questions && selectedAssignment.questions.length > 0 && (
                  <div className="task-questions-preview" style={{ marginBottom: '20px' }}>
                    <h4 className="desc-title" style={{ marginBottom: '12px' }}>
                      <span className="material-symbols-outlined">quiz</span>
                      Daftar Soal Terstruktur ({selectedAssignment.questions.length} Soal)
                    </h4>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {selectedAssignment.questions.map((q, idx) => (
                        <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: idx < selectedAssignment.questions.length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{idx + 1}. {q.text}</strong>
                            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                              Bobot: {q.points}
                            </span>
                          </div>
                          
                          {q.question_type === 'pilgan' && q.options && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = opt === q.correct_answer;
                                return (
                                  <div key={oIdx} style={{ 
                                    padding: '8px 12px', 
                                    background: isCorrect ? '#dcfce7' : '#ffffff', 
                                    border: `1px solid ${isCorrect ? '#86efac' : '#cbd5e1'}`,
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: isCorrect ? '#166534' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    {isCorrect && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16a34a' }}>check_circle</span>}
                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.question_type === 'essay' && (
                            <div style={{ marginTop: '8px', padding: '10px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Area jawaban uraian siswa...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lampiran File/Link Guru */}
                {selectedAssignment.attachments?.length > 0 && (
                  <div className="task-attachments-box">
                    <h4 className="desc-title">
                      <span className="material-symbols-outlined">attachment</span>
                      Lampiran File / Tautan Guru:
                    </h4>
                    <div className="attachment-links-list">
                      {selectedAssignment.attachments.map((att, i) => (
                        <div key={i} className="attachment-chip">
                          {att.type === 'file' ? (
                            <a href={`/uploads/${att.value}`} target="_blank" rel="noreferrer">
                              <span className="material-symbols-outlined">picture_as_pdf</span> Unduh File Lampiran
                            </a>
                          ) : (
                            <a href={att.value} target="_blank" rel="noreferrer">
                              <span className="material-symbols-outlined">link</span> {att.value}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STATS SUBMISI */}
              <div className="submission-stats-strip">
                <div className="stat-pill green">
                  <span className="dot"></span>
                  <span>Sudah Dinilai: <strong>{gradedCount}</strong></span>
                </div>
                <div className="stat-pill amber">
                  <span className="dot"></span>
                  <span>Belum Dinilai: <strong>{ungradedCount}</strong></span>
                </div>
                <div className="stat-pill grey">
                  <span className="dot"></span>
                  <span>Belum Mengumpulkan: <strong>{notSubmittedCount}</strong></span>
                </div>
                <div className="stat-pill total">
                  <span>Total Sekelas: <strong>{submissions.length} Siswa</strong></span>
                </div>
              </div>

              {/* TABEL SISWA SEKELAS WITH PAGINATION */}
              <div className="submissions-table-wrapper">
                <div className="table-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Daftar Pengumpulan & Penilaian Siswa Sekelas</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                    Menampilkan {(indexOfFirstItem + 1)} - {Math.min(indexOfLastItem, submissions.length)} dari {submissions.length} Siswa
                  </span>
                </div>

                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>No</th>
                      <th>Nama Siswa</th>
                      <th>Waktu Mengumpulkan</th>
                      <th>Detail Jawaban</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
                      <th>Feedback Guru</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSubmissions.length === 0 ? (
                      <tr><td colSpan="7" className="empty-state">Tidak ada data siswa pada kelas ini</td></tr>
                    ) : (
                      currentSubmissions.map((sub, idx) => {
                        const globalIndex = indexOfFirstItem + idx + 1;
                        const isSubmitted = sub.isSubmitted;
                        const isGraded = isSubmitted && sub.score !== null && sub.score !== '' && sub.score !== undefined;
                        const isExpiredNotSubmitted = !isSubmitted && isSelectedAssignmentExpired;

                        return (
                          <tr 
                            key={sub.student_id} 
                            className={`submission-row ${!isSubmitted ? 'not-submitted-row-shadow' : ''}`}
                          >
                            <td className="text-center font-bold">{globalIndex}</td>
                            <td>
                              <div className="student-name-group">
                                <strong>{sub.student_name}</strong>
                                <span className="nis-text">NIS: {sub.nis || '-'}</span>
                              </div>
                            </td>
                            <td className="date-cell">
                              {isSubmitted && sub.submitted_at 
                                ? new Date(sub.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                                : <span className="text-dash">-</span>
                              }
                            </td>
                            <td>
                              {isSubmitted ? (
                                <div className="submission-actions-cell" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  {sub.file && (
                                    <a 
                                      href={sub.file.startsWith('http') || sub.file.startsWith('data:') ? sub.file : (sub.file.startsWith('/uploads') ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}`.replace('/api', '') + sub.file : `/uploads/${sub.file}`)} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="btn-table-file"
                                    >
                                      <span className="material-symbols-outlined">picture_as_pdf</span> File
                                    </a>
                                  )}
                                  {sub.link && (
                                    <a href={sub.link} target="_blank" rel="noreferrer" className="btn-table-link">
                                      <span className="material-symbols-outlined">link</span> Link
                                    </a>
                                  )}
                                  {sub.content && (
                                    <button 
                                      className="btn-table-preview"
                                      onClick={() => setSelectedSubmissionModal(sub)}
                                      title="Lihat Detail Jawaban Teks"
                                    >
                                      <span className="material-symbols-outlined">visibility</span> Lihat Teks
                                    </button>
                                  )}
                                  {selectedAssignment.assignment_type === 'structured' && sub.answers && sub.answers.length > 0 && (
                                    <button 
                                      className="btn-table-preview"
                                      style={{ background: '#0284c7', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                      onClick={() => setSelectedSubmissionModal(sub)}
                                      title="Lihat Jawaban Terstruktur"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>quiz</span> Jawaban Soal
                                    </button>
                                  )}
                                  {!sub.file && !sub.link && !sub.content && !(selectedAssignment.assignment_type === 'structured' && sub.answers && sub.answers.length > 0) && (
                                    <span className="text-dash">Sudah Mengumpulkan</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-dash">Belum Mengumpulkan</span>
                              )}
                            </td>
                            <td className="text-center">
                              {!isSubmitted ? (
                                isSelectedAssignmentExpired ? (
                                  <span className="status-badge-chip red" title="Terlewati Deadline">Melewati Deadline</span>
                                ) : (
                                  <span className="status-badge-chip grey">Belum Mengumpulkan</span>
                                )
                              ) : isGraded ? (
                                <span className="status-badge-chip green">Sudah Dinilai</span>
                              ) : (
                                <span className="status-badge-chip amber">Belum Dinilai</span>
                              )}
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="feedback-input"
                                value={feedbacks[sub.student_id] || ''} 
                                onChange={(e) => handleFeedbackChange(sub.student_id, e.target.value)} 
                                placeholder={isExpiredNotSubmitted ? "Waktu pengerjaan berakhir" : "Tulis feedback..."} 
                                disabled={isExpiredNotSubmitted}
                                style={isExpiredNotSubmitted ? { opacity: 0.5, cursor: 'not-allowed', background: '#f1f5f9' } : {}}
                              />
                            </td>
                            <td className="text-center">
                              <input 
                                type="number" 
                                className="score-input"
                                value={grades[sub.student_id] !== undefined ? grades[sub.student_id] : ''} 
                                onChange={(e) => handleGradeChange(sub.student_id, e.target.value)} 
                                placeholder="0-100"
                                min="0"
                                max="100"
                                disabled={isExpiredNotSubmitted}
                                title={isExpiredNotSubmitted ? "Siswa melewatin deadline tanpa mengumpulkan tugas, nilai dikunci" : "Input Nilai Siswa"}
                                style={isExpiredNotSubmitted ? { opacity: 0.5, cursor: 'not-allowed', background: '#e2e8f0' } : {}}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                      className="btn-page" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: '700', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ‹ Sebelumnya
                    </button>
                    <span className="page-info" style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <button 
                      className="btn-page" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: '700', fontSize: '12px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Selanjutnya ›
                    </button>
                  </div>
                )}

                <div className="table-footer-bar">
                  <button className="btn-save-all-grades" onClick={handleSaveGrades} disabled={saving}>
                    <span className="material-symbols-outlined">save</span>
                    {saving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="empty-detail-card">
              <span className="material-symbols-outlined icon">assignment_turned_in</span>
              <p>Pilih tugas dari daftar sebelah kiri untuk melihat detail isi tugas & penilaian siswa.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL POPUP LIHAT JAWABAN SISWA */}
      {selectedSubmissionModal && (
        <div className="modal-backdrop" onClick={() => setSelectedSubmissionModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-outlined">article</span>
                Detail Jawaban: {selectedSubmissionModal.student_name}
              </h3>
              <button className="btn-close-modal" onClick={() => setSelectedSubmissionModal(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-meta-row" style={{ marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
                <span>Waktu Pengumpulan: <strong>{selectedSubmissionModal.submitted_at ? new Date(selectedSubmissionModal.submitted_at).toLocaleString('id-ID') : '-'}</strong></span>
              </div>
              
              {selectedAssignment?.assignment_type === 'structured' && selectedSubmissionModal.answers && selectedSubmissionModal.answers.length > 0 ? (
                <div className="modal-structured-answers">
                  {selectedSubmissionModal.answers.map((ans, idx) => {
                    const question = selectedAssignment.questions?.[idx];
                    const qText = question ? question.text : `Soal #${idx + 1}`;
                    return (
                      <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: idx < selectedSubmissionModal.answers.length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                          {idx + 1}. {qText}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', minWidth: '60px' }}>Jawaban:</span>
                          <div style={{ 
                            background: ans.is_correct ? '#dcfce7' : (question?.question_type === 'pilgan' ? '#fee2e2' : '#ffffff'),
                            color: ans.is_correct ? '#166534' : (question?.question_type === 'pilgan' ? '#991b1b' : '#334155'),
                            border: `1px solid ${ans.is_correct ? '#86efac' : (question?.question_type === 'pilgan' ? '#fca5a5' : '#cbd5e1')}`,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            flex: 1
                          }}>
                            {ans.answer_text || <em style={{ color: '#94a3b8' }}>Tidak dijawab</em>}
                          </div>
                        </div>
                        {question?.question_type === 'pilgan' && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: ans.is_correct ? '#16a34a' : '#ef4444', fontWeight: 'bold', marginLeft: '68px' }}>
                            {ans.is_correct ? `+${ans.points_earned} Poin` : `Salah (Kunci: ${question.correct_answer})`}
                          </div>
                        )}
                        {question?.question_type === 'essay' && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#0284c7', fontWeight: 'bold', marginLeft: '68px' }}>
                            (Bobot Maksimal: {question.points} Poin) - Perlu Dinilai Manual
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedSubmissionModal.pilgan_score !== undefined && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#334155', fontSize: '14px' }}>Skor Auto-Grade Pilihan Ganda:</strong>
                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        {selectedSubmissionModal.pilgan_score} Poin
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="modal-answer-text" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedSubmissionModal.content || <em style={{ color: '#94a3b8' }}>Tidak ada jawaban teks</em>}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn-cancel" onClick={() => setSelectedSubmissionModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuruAssignments;