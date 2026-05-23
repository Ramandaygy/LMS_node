import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-assignments.css';

const SiswaAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/siswa/assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error('Gagal ambil tugas', err);
      setMessage({ type: 'error', text: 'Gagal memuat tugas' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setSubmitting(true);
    const formData = new FormData();
    if (submissionFile) formData.append('file', submissionFile);
    if (submissionText) formData.append('content', submissionText);
    try {
      await api.post(`/siswa/assignments/${selectedAssignment._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'Tugas berhasil dikumpulkan' });
      setSelectedAssignment(null);
      setSubmissionFile(null);
      setSubmissionText('');
      fetchAssignments(); // refresh
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal mengumpulkan tugas' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Memuat tugas...</div>;

  return (
    <div className="siswa-assignments-container">
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="assignments-layout">
        {/* Kiri: Daftar Tugas */}
        <div className="assignments-list">
          <h3>Daftar Tugas</h3>
          {assignments.length === 0 ? (
            <div className="empty-state">Belum ada tugas untuk kelas Anda</div>
          ) : (
            assignments.map(assignment => (
              <div 
                key={assignment._id} 
                className={`assignment-card ${selectedAssignment?._id === assignment._id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAssignment(assignment);
                  setSubmissionFile(null);
                  setSubmissionText('');
                }}
              >
                <div className="card-header">
                  <h4>{assignment.title}</h4>
                  <div className="card-badges">
                    {assignment.submitted && assignment.score !== null && assignment.score !== undefined && (
                      <span className="score-badge">Nilai: {assignment.score}</span>
                    )}
                    <span className={`status-badge ${assignment.submitted ? 'submitted' : 'pending'}`}>
                      {assignment.submitted ? 'Sudah' : 'Belum'}
                    </span>
                  </div>
                </div>
                <div className="card-meta">
                  <span> {assignment.subject_name || 'Mapel'}</span>
                  <span> {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Kanan: Detail Tugas + Form Submit */}
        <div className="assignment-detail">
          {selectedAssignment ? (
            <>
              <h2>{selectedAssignment.title}</h2>
              <div className="detail-meta">
                <span> Mata Pelajaran: {selectedAssignment.subject_name}</span>
                <span> Kelas: {selectedAssignment.class_name}</span>
                <span> Deadline: {selectedAssignment.deadline ? new Date(selectedAssignment.deadline).toLocaleDateString() : '-'}</span>
              </div>
              <div className="detail-description">
                <h4>Deskripsi / Soal:</h4>
                <p>{selectedAssignment.description || '(Tidak ada deskripsi)'}</p>
              </div>
              {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                <div className="detail-attachments">
                  <h4>Lampiran Tugas:</h4>
                  <ul>
                    {selectedAssignment.attachments.map((att, idx) => (
                      <li key={idx}>
                        <a href={`${baseURL}/api/siswa/uploads/assignments/${att.path}?token=${token}`} target="_blank" rel="noopener noreferrer">
                          📎 {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedAssignment.submitted ? (
                <div className="submission-status">
                  <p> Anda sudah mengumpulkan tugas ini.</p>
                  {selectedAssignment.score !== null && selectedAssignment.score !== undefined && (
                    <p>Nilai: <strong>{selectedAssignment.score}</strong> / {selectedAssignment.max_score}</p>
                  )}
                  {selectedAssignment.feedback && <p>Feedback: {selectedAssignment.feedback}</p>}
                </div>
              ) : (
                <form onSubmit={handleSubmitAssignment} className="submit-form">
                  <h3>Kumpulkan Tugas</h3>
                  <div className="form-group">
                    <label>Upload File (PDF, DOC, Gambar, ZIP)</label>
                    <input type="file" onChange={(e) => setSubmissionFile(e.target.files[0])} />
                  </div>
                  <div className="form-group">
                    <label>Catatan (opsional)</label>
                    <textarea rows="3" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Tulis catatan untuk guru..." />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setSelectedAssignment(null)}>Batal</button>
                    <button type="submit" className="btn-submit" disabled={submitting}>
                      {submitting ? 'Mengirim...' : 'Kumpulkan'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="empty-detail">Pilih tugas dari daftar sebelah kiri</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiswaAssignments;