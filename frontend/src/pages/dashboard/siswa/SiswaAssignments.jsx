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

  useEffect(() => {
    fetchAssignments();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
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

  const handleSelect = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionFile(null);
    setSubmissionLink('');
    setSubmissionText('');
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

  if (loading) return <div className="loading">Memuat tugas...</div>;

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
          {assignments.length === 0 && <div className="empty">Belum ada tugas</div>}
          {assignments.map(assignment => (
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
                Deadline: {new Date(assignment.deadline).toLocaleString()}
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
                      <span className="value">{new Date(selectedAssignment.deadline).toLocaleString()}</span>
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
                          <a href={`${baseURL}/uploads/${att.value}`} target="_blank" rel="noopener noreferrer">
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
                    <div className="my-submission">
                      <strong>File yang dikirim:</strong> <a href={`${baseURL}/uploads/${selectedAssignment.submission_file}`} target="_blank">Lihat lampiran</a>
                    </div>
                  )}
                  {selectedAssignment.submission_link && (
                    <div className="my-submission">
                      <strong>Link yang dikirim:</strong> <a href={selectedAssignment.submission_link} target="_blank">{selectedAssignment.submission_link}</a>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="submit-form">
                  <h3>Kumpulkan Tugas</h3>
                  <div className="form-group">
                    <label>Upload File (PDF, gambar, doc, max 5MB)</label>
                    <div className="file-zone">
                      <input type="file" onChange={(e) => setSubmissionFile(e.target.files[0])} />
                      <span className="helper">Klik atau tarik file ke sini</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Atau masukkan link (Google Drive, dll)</label>
                    <input type="url" placeholder="https://..." value={submissionLink} onChange={(e) => setSubmissionLink(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Catatan (opsional)</label>
                    <textarea rows="3" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Tulis catatan untuk guru..." />
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