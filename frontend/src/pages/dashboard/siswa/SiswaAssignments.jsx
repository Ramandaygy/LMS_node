import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-assignments.css';

const SiswaAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Semua');
  const [allSubjects, setAllSubjects] = useState([]);

  const getSubmissionFileUrl = (pathStr) => {
    if (!pathStr) return '#';
    if (pathStr.startsWith('http')) return pathStr;
    if (pathStr.startsWith('/uploads')) return `${baseURL}${pathStr}`;
    return `${baseURL}/uploads/${pathStr}`;
  };

  useEffect(() => {
    fetchAssignments();
    fetchSubjects();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments/siswa/me');
      setAssignments(res.data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat tugas' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setAllSubjects(res.data.data || res.data.subjects || []);
    } catch (err) {
      console.error('Gagal memuat mata pelajaran:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (submissionFile && submissionFile.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran file melebihi batas (Maks. 5MB).' });
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    if (submissionFile) formData.append('file', submissionFile);
    if (submissionLink) formData.append('link', submissionLink);
    if (submissionText) formData.append('content', submissionText);
    try {
      await api.post(`/assignments/${selectedAssignment._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'Tugas berhasil dikumpulkan' });
      await fetchAssignments();
      setSelectedAssignment(null);
      setSubmissionFile(null);
      setSubmissionLink('');
      setSubmissionText('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal mengumpulkan' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran file terlalu besar (Maks. 5MB).' });
      e.target.value = null; // Reset input field
      return;
    }
    setSubmissionFile(file);
  };

  const handleSelect = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionFile(null);
    setSubmissionLink('');
    setSubmissionText('');
    setMessage({ type: '', text: '' });
  };

  const formatDeadline = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' WIB';
    } catch (e) {
      return dateStr;
    }
  };

  const getRemaining = (deadline) => {
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl - now;
    if (diff <= 0) return { text: 'Lewat deadline', class: 'overdue' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return { text: `${hours} jam tersisa`, class: 'urgent' };
    const days = Math.floor(hours / 24);
    return { text: `${days} hari tersisa`, class: 'normal' };
  };

  const [statusFilter, setStatusFilter] = useState('Semua');

  if (loading) return <div className="loading">Memuat tugas...</div>;

  const subjects = [...new Set(assignments.map(a => a.subject_name).filter(Boolean))];
  const filteredAssignments = assignments.filter(a => {
    const matchSubject = selectedSubjectFilter === 'Semua' || a.subject_name === selectedSubjectFilter;
    const matchStatus = statusFilter === 'Semua' || 
      (statusFilter === 'Sudah' && a.submitted) || 
      (statusFilter === 'Belum' && !a.submitted);
    return matchSubject && matchStatus;
  });

  return (
    <div className="siswa-assignments-container">
      {message.text && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="assignments-grid">
        {/* Daftar tugas (kiri) */}
        <div className="assignments-list">
          <h3 className="list-title">Daftar Tugas</h3>
          
          {/* Status Tabs & Subject Dropdown Filter Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div className="status-filters" style={{ display: 'flex', gap: '6px' }}>
              {['Semua', 'Belum', 'Sudah'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: statusFilter === status ? '#0284c7' : '#f1f5f9',
                    color: statusFilter === status ? '#ffffff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  {status === 'Semua' && ' Semua'}
                  {status === 'Belum' && ' Belum Dikerjakan'}
                  {status === 'Sudah' && ' Sudah Dikerjakan'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>filter_alt</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                 <option value="Semua">Semua Mata Pelajaran</option>
                 {[...new Set([
                   ...allSubjects.map(s => s.name).filter(Boolean),
                   ...assignments.map(a => a.subject_name).filter(Boolean)
                 ])].sort().map(sub => (
                   <option key={sub} value={sub}>{sub}</option>
                 ))}
               </select>
            </div>
          </div>

          {filteredAssignments.length === 0 && <div className="empty">Belum ada tugas</div>}
          {filteredAssignments.map(assignment => (
            <div
              key={assignment._id}
              className={`assignment-card ${selectedAssignment?._id === assignment._id ? 'selected' : ''}`}
              onClick={() => handleSelect(assignment)}
            >
              <div className="card-header">
                <div className="card-icon">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div className="card-info">
                  <h4>{assignment.title}</h4>
                  <div className="meta">
                    {assignment.subject_name} • {assignment.class_name}
                  </div>
                </div>
                <div className="status-badge">
                  {assignment.submitted ? (
                    <span className="badge submitted">Sudah</span>
                  ) : (
                    <span className="badge pending">Belum</span>
                  )}
                </div>
              </div>
              <div className="deadline">
                Deadline: {formatDeadline(assignment.deadline)}
              </div>
              {assignment.submitted && assignment.score !== null && (
                <div className="score-preview">
                  Nilai: {assignment.score} / {assignment.max_score}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail tugas + submission (kanan) */}
        <div className="assignment-detail">
          {selectedAssignment ? (
            <div className="detail-card">
              <div className="detail-header">
                <div className="title-section">
                  <h2>{selectedAssignment.title}</h2>
                  <div className="status-chip">
                    {selectedAssignment.submitted ? (
                      <span className="chip submitted">Sudah Dikumpulkan</span>
                    ) : (
                      <span className="chip pending">Belum Dikumpulkan</span>
                    )}
                  </div>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span className="material-symbols-outlined">school</span>
                    <div>
                      <span className="label">Mata Pelajaran</span>
                      <span className="value">{selectedAssignment.subject_name}</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="material-symbols-outlined">class</span>
                    <div>
                      <span className="label">Kelas</span>
                      <span className="value">{selectedAssignment.class_name}</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="material-symbols-outlined">event</span>
                    <div>
                      <span className="label">Deadline</span>
                      <span className="value">{formatDeadline(selectedAssignment.deadline)}</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="material-symbols-outlined">timer</span>
                    <div>
                      <span className="label">Sisa Waktu</span>
                      <span className={`value ${getRemaining(selectedAssignment.deadline).class}`}>
                        {getRemaining(selectedAssignment.deadline).text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-description">
                <h3>Instruksi Tugas</h3>
                <div className="desc-content">
                  {selectedAssignment.description || 'Tidak ada deskripsi.'}
                </div>
              </div>

              {selectedAssignment.attachments?.length > 0 && (
                <div className="detail-attachments">
                  <h3>Materi Pendukung</h3>
                  <ul className="attachments-list">
                    {selectedAssignment.attachments.map((att, i) => (
                      <li key={i}>
                        {att.type === 'file' ? (
                          <a href={getSubmissionFileUrl(att.value)} target="_blank" rel="noopener noreferrer">
                            <span className="material-symbols-outlined">attach_file</span> Unduh File
                          </a>
                        ) : (
                          <a href={att.value} target="_blank" rel="noopener noreferrer">
                            <span className="material-symbols-outlined">link</span> {att.value}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAssignment.submitted ? (
                <div className="submission-status">
                  <div className="status-success">
                    <span className="material-symbols-outlined">check_circle</span>
                    <div>
                      <h4>Tugas telah dikumpulkan</h4>
                      {selectedAssignment.submitted_at && (
                        <p>Pada: {new Date(selectedAssignment.submitted_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  {selectedAssignment.score !== null && (
                    <div className={`score-result ${selectedAssignment.score < selectedAssignment.kkm ? 'below-kkm' : ''}`}>
                      <span>Nilai: <strong>{selectedAssignment.score}</strong> / {selectedAssignment.max_score}</span>
                      {selectedAssignment.score < selectedAssignment.kkm && (
                        <span className="kkm-warning"> (Belum mencapai KKM {selectedAssignment.kkm})</span>
                      )}
                    </div>
                  )}
                  {selectedAssignment.feedback && (
                    <div className="feedback">
                      <strong>Feedback Guru:</strong> {selectedAssignment.feedback}
                    </div>
                  )}

                  {selectedAssignment.submission_file && (
                    <div className="my-submission" style={{ marginTop: '10px' }}>
                      <strong>File yang dikirim:</strong> <br/>
                      <a 
                        href={selectedAssignment.submission_file.startsWith('http') || selectedAssignment.submission_file.startsWith('data:') ? selectedAssignment.submission_file : (selectedAssignment.submission_file.startsWith('/uploads') ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}`.replace('/api', '') + selectedAssignment.submission_file : `/uploads/${selectedAssignment.submission_file}`)} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', padding: '5px 10px', borderRadius: '5px', textDecoration: 'none', color: '#334155', marginTop: '5px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span> 
                        Buka File
                      </a>
                    </div>
                  )}
                  {selectedAssignment.submission_link && (
                    <div className="my-submission" style={{ marginTop: '10px' }}>
                      <strong>Link yang dikirim:</strong> <br/>
                      <a href={selectedAssignment.submission_link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{selectedAssignment.submission_link}</a>
                    </div>
                  )}
                  {selectedAssignment.submission_content && (
                    <div className="my-submission" style={{ marginTop: '10px' }}>
                      <strong>Teks Jawaban:</strong>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '5px', marginTop: '5px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0' }}>
                        {selectedAssignment.submission_content}
                      </div>
                    </div>
                  )}
                </div>
              ) : new Date() > new Date(selectedAssignment.deadline) ? (
                <div className="submission-status" style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171' }}>
                  <div className="status-success" style={{ color: '#ef4444' }}>
                    <span className="material-symbols-outlined">error</span>
                    <div>
                      <h4>Tugas tidak dapat dikumpulkan</h4>
                      <p>Batas waktu (deadline) untuk tugas ini telah berakhir.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="submit-form">
                  <h3>Kumpulkan Tugas</h3>
                  <div className="form-group">
                    <label>Upload File (PDF, gambar, doc, max 5MB)</label>
                    <div className="file-zone" style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        id="file-upload-input" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                      />
                      <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#f8fafc', transition: 'border-color 0.2s' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#64748b' }}>cloud_upload</span>
                        <span className="helper" style={{ display: 'block', marginTop: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                          {submissionFile ? `Terpilih: ${submissionFile.name}` : 'Klik untuk memilih atau unggah file'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Atau masukkan link (Google Drive, dll)</label>
                    <input type="url" placeholder="https://..." value={submissionLink} onChange={(e) => setSubmissionLink(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Ketikan jawaban disini</label>
                    <textarea rows="3" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Tulis jawaban Anda di sini..." />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setSelectedAssignment(null)}>Batal</button>
                    <button type="submit" disabled={submitting}>
                      {submitting ? 'Mengirim...' : 'Kumpulkan'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="empty-detail">Pilih tugas dari daftar sebelah kiri</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiswaAssignments;