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
  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    class_id: '',
    description: '',
    deadline: '',
    kkm: 70,
    attachments: [],
    max_score: 100,
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
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error('Gagal ambil tugas', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.data || []);
      const initialGrades = {};
      const initialFeedbacks = {};
      res.data.data.forEach(sub => {
        initialGrades[sub.student_id] = sub.score !== null ? sub.score : '';
        initialFeedbacks[sub.student_id] = sub.feedback || '';
      });
      setGrades(initialGrades);
      setFeedbacks(initialFeedbacks);
    } catch (err) {
      console.error('Gagal ambil submisi', err);
    }
  };

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    fetchSubmissions(assignment._id);
    setShowCreateForm(false);
    setEditMode(false);
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
    });
    setShowCreateForm(true);
    setSelectedAssignment(null);
  };

  const handleDeleteAssignment = async (e, id) => {
    e.stopPropagation();
    if(window.confirm('Yakin ingin menghapus tugas ini? Semua data submisi dan nilai akan hilang!')) {
      try {
        await api.delete(`/assignments/${id}`);
        alert('Tugas berhasil dihapus');
        fetchAssignments();
        if(selectedAssignment && selectedAssignment._id === id) {
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
    data.append('subject', formData.subject_id);
    data.append('class', formData.class_id);
    data.append('description', formData.description);
    data.append('deadline', new Date(formData.deadline).toISOString());
    data.append('kkm', formData.kkm);
    data.append('max_score', formData.max_score);
    // attachments
    formData.attachments.forEach((att, idx) => {
      if (att.type === 'file' && att.value) {
        data.append(`attachments`, att.value);
      } else if (att.type === 'link' && att.value) {
        data.append(`links`, att.value);
      }
    });
    try {
      if (editMode && editingAssignment) {
        await api.put(`/assignments/${editingAssignment._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Tugas berhasil diupdate');
      } else {
        await api.post('/assignments', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Tugas berhasil dibuat');
      }
      setShowCreateForm(false);
      setEditMode(false);
      setFormData({
        title: '', subject_id: '', class_id: '', description: '', deadline: '', kkm: 70,
        attachments: [], max_score: 100
      });
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tugas');
    }
  };

  const handleGradeChange = (studentId, value) => {
    setGrades({ ...grades, [studentId]: value });
  };

  const handleFeedbackChange = (studentId, value) => {
    setFeedbacks({ ...feedbacks, [studentId]: value });
  };

  const handleSaveGrades = async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      for (const sub of submissions) {
        const newScore = grades[sub.student_id];
        const newFeedback = feedbacks[sub.student_id];
        if (newScore !== sub.score || newFeedback !== sub.feedback) {
          await api.post(`/assignments/${selectedAssignment._id}/grade`, {
            student_id: sub.student_id,
            score: newScore,
            feedback: newFeedback
          });
        }
      }
      alert('Nilai berhasil disimpan');
      fetchAssignments();
      fetchSubmissions(selectedAssignment._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal simpan nilai');
    } finally {
      setSaving(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const deadline = new Date(assignment.deadline);
    if (deadline < now) return 'completed';
    if (assignment.submitted_count === assignment.total_students) return 'grading';
    return 'active';
  };

  const filteredAssignments = assignments.filter(a => {
    const status = getAssignmentStatus(a);
    if (filter === 'all') return true;
    return status === filter;
  });

  if (loading) return <div className="loading">Memuat data...</div>;

  return (
    <div className="guru-assignments-container">
      <div className="page-header">
        <div>
          <h1>Manajemen Tugas</h1>
          <p>Buat, kelola, dan nilai tugas siswa</p>
        </div>
        <button className="btn-create" onClick={() => { setShowCreateForm(true); setSelectedAssignment(null); setEditMode(false); setFormData({ title: '', subject_id: '', class_id: '', description: '', deadline: '', kkm: 70, attachments: [], max_score: 100 }); }}>
          + Buat Tugas Baru
        </button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Tugas</button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Aktif</button>
        <button className={`tab ${filter === 'grading' ? 'active' : ''}`} onClick={() => setFilter('grading')}>Penilaian</button>
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Selesai</button>
      </div>

      <div className="main-layout">
        {/* Daftar tugas (kiri) */}
        <div className="assignments-list">
          {filteredAssignments.length === 0 && <div className="empty">Belum ada tugas</div>}
          {filteredAssignments.map(assignment => {
            const status = getAssignmentStatus(assignment);
            const isSelected = selectedAssignment?._id === assignment._id;
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
                    <span>{assignment.subject_name}</span> • <span>{assignment.class_name}</span>
                  </div>
                  <div className="deadline">Deadline: {new Date(assignment.deadline).toLocaleString()}</div>
                  <div className="progress">
                    Dikumpulkan: {assignment.submitted_count || 0}/{assignment.total_students || 0}
                  </div>
                  <div className={`status ${status}`}>
                    {status === 'active' ? 'Aktif' : status === 'grading' ? 'Penilaian' : 'Selesai'}
                  </div>
                </div>
                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-edit" onClick={(e) => handleEdit(assignment, e)}>Edit</button>
                  <button className="btn-delete" onClick={(e) => handleDeleteAssignment(e, assignment._id)} style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Hapus</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail & penilaian (kanan) */}
        <div className="assignment-detail">
          {showCreateForm ? (
            <div className="create-form">
              <h2>{editMode ? 'Edit Tugas' : 'Buat Tugas Baru'}</h2>
              <form onSubmit={handleSubmitAssignment}>
                <div className="form-group">
                  <label>Judul Tugas</label>
                  <input name="title" value={formData.title} onChange={handleFormChange} required />
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
                    <label>Kelas</label>
                    <select name="class_id" value={formData.class_id} onChange={handleFormChange} required>
                      <option value="">Pilih Kelas</option>
                      {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea name="description" rows="4" value={formData.description} onChange={handleFormChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Deadline (tanggal & jam)</label>
                    <input type="datetime-local" name="deadline" value={formData.deadline} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label>KKM</label>
                    <input type="number" name="kkm" value={formData.kkm} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label>Nilai Maksimal</label>
                    <input type="number" name="max_score" value={formData.max_score} onChange={handleFormChange} />
                  </div>
                </div>
                <div className="form-group attachments">
                  <label>Lampiran (file atau link)</label>
                  {formData.attachments.map((att, idx) => (
                    <div key={idx} className="attachment-row">
                      <select value={att.type} onChange={(e) => handleAttachmentTypeChange(idx, e.target.value)}>
                        <option value="file">File (max 5MB)</option>
                        <option value="link">Link URL</option>
                      </select>
                      {att.type === 'file' ? (
                        <input type="file" onChange={(e) => handleAttachmentFileChange(idx, e.target.files[0])} />
                      ) : (
                        <input type="url" placeholder="https://..." value={att.value || ''} onChange={(e) => handleAttachmentLinkChange(idx, e.target.value)} />
                      )}
                      <button type="button" className="remove-btn" onClick={() => removeAttachment(idx)}>Hapus</button>
                    </div>
                  ))}
                  <button type="button" className="add-attachment" onClick={handleAddAttachment}>+ Tambah Lampiran</button>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowCreateForm(false)}>Batal</button>
                  <button type="submit">Simpan</button>
                </div>
              </form>
            </div>
          ) : selectedAssignment ? (
            <div className="grading-section">
              <div className="detail-header">
                <h2>{selectedAssignment.title}</h2>
                <div className="detail-meta">
                  <span>{selectedAssignment.subject_name}</span>
                  <span>{selectedAssignment.class_name}</span>
                  <span>Deadline: {new Date(selectedAssignment.deadline).toLocaleString()}</span>
                  <span>KKM: {selectedAssignment.kkm}</span>
                </div>
              </div>
              {/* Lampiran tugas */}
              {selectedAssignment.attachments?.length > 0 && (
                <div className="attachments-list">
                  <label>Lampiran:</label>
                  <ul>
                    {selectedAssignment.attachments.map((att, i) => (
                      <li key={i}>
                        {att.type === 'file' ? (
                          <a href={`/uploads/${att.value}`} target="_blank">📄 Unduh File</a>
                        ) : (
                          <a href={att.value} target="_blank">🔗 {att.value}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Tabel submisi siswa */}
              <div className="submissions-table-wrapper">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Nama Siswa</th>
                      <th>Tgl Submisi</th>
                      <th>Jawaban</th>
                      <th>Feedback</th>
                      <th>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr><td colSpan="5" className="empty">Belum ada submisi</td></tr>
                    ) : (
                      submissions.map(sub => (
                        <tr key={sub.student_id}>
                          <td>{sub.student_name}</td>
                          <td>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}</td>
                          <td>
                            {sub.file && <a href={`/uploads/${sub.file}`} target="_blank">📄 File</a>}
                            {sub.link && <a href={sub.link} target="_blank">🔗 Link</a>}
                            {sub.content && <div className="answer-preview">{sub.content}</div>}
                          </td>
                          <td>
                            <input type="text" value={feedbacks[sub.student_id] || ''} onChange={(e) => handleFeedbackChange(sub.student_id, e.target.value)} placeholder="Tulis feedback..." />
                          </td>
                          <td>
                            <input type="number" value={grades[sub.student_id] || ''} onChange={(e) => handleGradeChange(sub.student_id, e.target.value)} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grading-actions">
                <button className="btn-save" onClick={handleSaveGrades} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-detail">
              <p>Pilih tugas dari daftar sebelah kiri</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuruAssignments;