import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-materials.css';

const GuruMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    class_id: '',
    subject_id: '',
    description: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchTeacherProfile();
    fetchMaterials();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const res = await api.get('/guru/profile');
      setTeacherSubjects(res.data.subjects || []);
      setTeacherClasses(res.data.classes || []);
      // Jika kosong, beri peringatan
      if (res.data.subjects?.length === 0) {
        setErrorMsg('Anda belum diassign mata pelajaran. Hubungi admin.');
      }
      if (res.data.classes?.length === 0) {
        setErrorMsg(prev => prev ? prev + ' Anda belum diassign kelas.' : 'Anda belum diassign kelas. Hubungi admin.');
      }
    } catch (err) {
      console.error('Gagal ambil profil', err);
      setErrorMsg('Gagal mengambil data profil guru');
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/guru/materials');
      setMaterials(res.data.materials || []);
    } catch (err) {
      setErrorMsg('Gagal memuat materi');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ title: '', class_id: '', subject_id: '', description: '' });
    setAttachments([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validasi frontend
    if (!formData.title.trim()) {
      setErrorMsg('Judul materi harus diisi');
      return;
    }
    if (!formData.subject_id) {
      setErrorMsg('Pilih mata pelajaran');
      return;
    }
    if (!formData.class_id) {
      setErrorMsg('Pilih kelas');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('class_id', formData.class_id);
    data.append('subject_id', formData.subject_id);
    data.append('description', formData.description);
    attachments.forEach(file => data.append('attachments', file));

    try {
      if (editing) {
        await api.put(`/guru/materials/${editing._id}`, data);
        setSuccessMsg('Materi berhasil diupdate');
      } else {
        await api.post('/guru/materials', data);
        setSuccessMsg('Materi berhasil diupload');
      }
      resetForm();
      fetchMaterials();
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan materi';
      setErrorMsg(msg);
      console.error('Upload error:', err.response?.data);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus materi ini?')) {
      try {
        await api.delete(`/guru/materials/${id}`);
        setSuccessMsg('Materi berhasil dihapus');
        fetchMaterials();
      } catch (err) {
        setErrorMsg('Gagal menghapus materi');
      }
    }
  };

  if (loading) return <div className="loading">Memuat...</div>;

  return (
    <div className="guru-materials-container">
      <div className="header">
        <h2>📚 Materi Pembelajaran</h2>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Upload Materi Baru</button>
        )}
      </div>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
      {successMsg && <div className="success-msg">{successMsg}</div>}

      {/* Form inline */}
      {showForm && (
        <div className="material-form">
          <h3>{editing ? 'Edit Materi' : 'Upload Materi Baru'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Judul Materi *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mata Pelajaran *</label>
                <select name="subject_id" value={formData.subject_id} onChange={handleChange} required>
                  <option value="">Pilih Mapel</option>
                  {teacherSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Kelas *</label>
                <select name="class_id" value={formData.class_id} onChange={handleChange} required>
                  <option value="">Pilih Kelas</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Deskripsi (opsional)</label>
              <textarea name="description" rows="3" value={formData.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>File Lampiran</label>
              <input type="file" multiple onChange={e => setAttachments(Array.from(e.target.files))} />
              <small>Anda dapat memilih beberapa file (PDF, gambar, video, zip, dll)</small>
            </div>
            <div className="form-actions">
              <button type="button" onClick={resetForm}>Batal</button>
              <button type="submit">Upload</button>
            </div>
          </form>
        </div>
      )}

      <div className="materials-grid">
        {materials.length === 0 && !showForm && <p>Belum ada materi. Klik "Upload Materi Baru" untuk menambahkan.</p>}
        {materials.map(mat => (
          <div key={mat._id} className="material-card">
            <div className="material-title">{mat.title}</div>
            <div className="material-meta">{mat.subject_name} - {mat.class_name}</div>
            <div className="material-desc">{mat.description}</div>
            {mat.attachments?.length > 0 && (
              <div className="material-attachments">
                <strong>Lampiran:</strong>
                <ul>
                  {mat.attachments.map((att, idx) => (
                    <li key={idx}>
                      <a href={`/api/guru/uploads/materials/${att.path}`} target="_blank" rel="noopener noreferrer">
                        📎 {att.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="material-actions">
              <button className="btn-delete" onClick={() => handleDelete(mat._id)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuruMaterials;