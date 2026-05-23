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
    max_score: 100
  });
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetchTeacherProfile();
    fetchAssignments();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const res = await api.get('/guru/profile');
      setTeacherSubjects(res.data.subjects || []);
      setTeacherClasses(res.data.classes || []);
    } catch (err) {
      console.error('Gagal ambil profil guru', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/guru/assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error('Gagal ambil tugas', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await api.get(`/guru/assignments/${assignmentId}/submissions`);
      const subs = res.data.submissions;
      setSubmissions(subs);
      const initialGrades = {};
      const initialFeedbacks = {};
      subs.forEach(sub => {
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
    setEditingAssignment(null);
  };

  const handleEdit = (assignment, e) => {
    e.stopPropagation();
    setEditingAssignment(assignment);
    setEditMode(true);
    setFormData({
      title: assignment.title,
      subject_id: assignment.subject_id,
      class_id: assignment.class_id,
      description: assignment.description || '',
      deadline: assignment.deadline ? assignment.deadline.split('T')[0] : '',
      max_score: assignment.max_score
    });
    setAttachments([]);
    setShowCreateForm(true);
    setSelectedAssignment(null);
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
      for (const submission of submissions) {
        const studentId = submission.student_id;
        const newScore = grades[studentId];
        const newFeedback = feedbacks[studentId];
        const originalScore = submission.score !== null ? submission.score : '';
        const originalFeedback = submission.feedback || '';
        if (newScore !== originalScore || newFeedback !== originalFeedback) {
          await api.post(`/guru/assignments/${selectedAssignment._id}/grade`, {
            student_id: studentId,
            score: newScore,
            feedback: newFeedback
          });
        }
      }
      alert('Nilai berhasil disimpan');
      fetchAssignments();
      fetchSubmissions(selectedAssignment._id);
    } catch (err) {
      console.error('Gagal simpan nilai', err);
      alert(err.response?.data?.error || 'Gagal simpan nilai');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('subject_id', formData.subject_id);
    data.append('class_id', formData.class_id);
    data.append('description', formData.description);
    data.append('deadline', formData.deadline);
    data.append('max_score', formData.max_score);
    if (attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        data.append('attachments', attachments[i]);
      }
    }

    try {
      if (editMode && editingAssignment) {
        await api.put(`/guru/assignments/${editingAssignment._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Tugas berhasil diupdate');
      } else {
        await api.post('/guru/assignments', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Tugas berhasil dibuat');
      }
      setShowCreateForm(false);
      setEditMode(false);
      setEditingAssignment(null);
      setFormData({
        title: '',
        subject_id: '',
        class_id: '',
        description: '',
        deadline: '',
        max_score: 100
      });
      setAttachments([]);
      fetchAssignments();
    } catch (err) {
      console.error('Gagal simpan tugas', err);
      alert(err.response?.data?.error || 'Gagal menyimpan tugas');
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  if (loading) return <div className="loading">Memuat tugas...</div>;

  return (
    <div className="guru-assignments-container">
      <div className="guru-assignments-header">
        <div>
          <h1>Manajemen Tugas</h1>
          <p>Buat, kelola, dan nilai tugas siswa</p>
        </div>
        <button className="btn-create" onClick={() => { setShowCreateForm(true); setSelectedAssignment(null); setEditMode(false); setEditingAssignment(null); setAttachments([]); setFormData({ title: '', subject_id: '', class_id: '', description: '', deadline: '', max_score: 100 }); }}>
          + Buat Tugas Baru
        </button>
      </div>

      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Tugas</button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Aktif</button>
        <button className={`tab ${filter === 'grading' ? 'active' : ''}`} onClick={() => setFilter('grading')}>Penilaian</button>
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Selesai</button>
      </div>

      <div className="assignments-layout">
        <div className="assignments-list">
          {filteredAssignments.length === 0 && <div className="empty-assignments">Belum ada tugas. Klik "Buat Tugas Baru" untuk membuat tugas pertama.</div>}
          {filteredAssignments.map(assignment => (
            <div 
              key={assignment._id} 
              className={`assignment-card ${selectedAssignment?._id === assignment._id ? 'selected' : ''}`}
              onClick={() => handleSelectAssignment(assignment)}
            >
              <div className="assignment-card-header">
                <div className="assignment-icon">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div>
                  <h3>{assignment.title}</h3>
                  <span className="assignment-meta">{assignment.subject_name} - {assignment.class_name}</span>
                </div>
              </div>
              <div className="assignment-deadline">
                📅 Deadline: {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '-'}
              </div>
              <div className="assignment-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${assignment.total ? (assignment.submitted / assignment.total) * 100 : 0}%` }}></div>
                </div>
                <span>{assignment.submitted}/{assignment.total} siswa mengumpulkan</span>
              </div>
              <div className="assignment-status">
                <span className={`status-badge ${assignment.status}`}>
                  {assignment.status === 'active' ? 'Aktif' : assignment.status === 'grading' ? 'Penilaian' : 'Selesai'}
                </span>
              </div>
              <div className="assignment-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-edit" onClick={(e) => handleEdit(assignment, e)}>✏️ Edit</button>
              </div>
            </div>
          ))}
        </div>

        <div className="assignment-detail">
          {showCreateForm ? (
            <div className="create-form">
              <h2>{editMode ? 'Edit Tugas' : 'Buat Tugas Baru'}</h2>
              <form onSubmit={handleSubmitAssignment}>
                <div className="form-group">
                  <label>Judul Tugas *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Mata Pelajaran *</label>
                  <select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} required>
                    <option value="">Pilih Mapel</option>
                    {teacherSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Kelas *</label>
                  <select value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: e.target.value})} required>
                    <option value="">Pilih Kelas</option>
                    {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea rows="4" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Deadline</label>
                    <input type="date" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Nilai Maksimal</label>
                    <input type="number" value={formData.max_score} onChange={(e) => setFormData({...formData, max_score: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Lampiran File (opsional)</label>
                  <input type="file" multiple onChange={(e) => setAttachments(Array.from(e.target.files))} />
                  <small>Anda dapat memilih beberapa file (pdf, doc, gambar, zip)</small>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowCreateForm(false); setEditMode(false); }}>Batal</button>
                  <button type="submit" className="btn-primary">{editMode ? 'Update Tugas' : 'Publikasi'}</button>
                </div>
              </form>
            </div>
          ) : selectedAssignment ? (
            <div className="grading-section">
              <h2>{selectedAssignment.title}</h2>
              <div className="assignment-info">
                <span>{selectedAssignment.subject_name} - {selectedAssignment.class_name}</span>
                <span>Deadline: {new Date(selectedAssignment.deadline).toLocaleDateString()}</span>
                <span>Nilai Maks: {selectedAssignment.max_score}</span>
              </div>
              {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                <div className="attachments-section">
                  <h4>Lampiran Tugas</h4>
                  <ul>
                    {selectedAssignment.attachments.map((att, idx) => (
                      <li key={idx}>
                        <a href={`/api/guru/uploads/assignments/${att.path.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                          📎 {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="submissions-table">
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
                    {submissions.map(student => (
                      <tr key={student.student_id}>
                        <td>{student.student_name}</td>
                        <td>{student.submitted_at ? new Date(student.submitted_at).toLocaleDateString() : '-'}</td>
                        <td>
                          {student.file ? (
                            <a href={`/api/guru/uploads/submissions/${student.file.path}`} target="_blank" rel="noopener noreferrer">
                              📎 {student.file.filename}
                            </a>
                          ) : student.content ? (
                            <div className="answer-text" title={student.content}>
                              {student.content.length > 50 ? student.content.substring(0, 50) + '...' : student.content}
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          <input type="text" placeholder="Feedback" value={feedbacks[student.student_id] || ''} onChange={(e) => handleFeedbackChange(student.student_id, e.target.value)} />
                        </td>
                        <td>
                          <input type="number" value={grades[student.student_id] || ''} onChange={(e) => handleGradeChange(student.student_id, e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
              <div className="grading-actions">
                <button className="btn-primary" onClick={handleSaveGrades} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-detail">
              <p>Pilih tugas dari daftar sebelah kiri untuk melihat detail dan penilaian.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuruAssignments;