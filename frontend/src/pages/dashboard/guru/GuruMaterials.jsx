
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-materials.css';

const GuruMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    class_id: '',
    subject_id: '',
    external_link: '',
    file: null
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchMaterials();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      setTeacherSubjects(res.data.subjects || []);
      setTeacherClasses(res.data.classes || []);
    } catch (err) {
      console.error('Gagal ambil profil guru', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/materials/guru/me');
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error('Gagal ambil materi', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('content', form.content);
    data.append('class_id', form.class_id);
    data.append('subject_id', form.subject_id);
    data.append('external_link', form.external_link);
    if (form.file) data.append('file', form.file);
    try {
      await api.post('/materials', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Materi berhasil disimpan');
      setForm({ title: '', description: '', content: '', class_id: '', subject_id: '', external_link: '', file: null });
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal simpan materi');
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt || !form.class_id || !form.subject_id) {
      alert('Lengkapi prompt, kelas, dan mapel terlebih dahulu');
      return;
    }
    try {
      await api.post('/materials/generate-ai', {
        prompt: aiPrompt,
        titleSuggestion: aiTitle,
        class_id: form.class_id,
        subject_id: form.subject_id
      });
      alert('Materi berhasil dibuat dengan AI');
      fetchMaterials();
      setAiPrompt('');
      setAiTitle('');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate AI');
    }
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) return <div className="loading">Memuat materi...</div>;

  return (
    <div className="guru-materials-container">
      <div className="page-header">
        <h1>Materi Pembelajaran</h1>
        <p>Kelola materi pembelajaran untuk kelas Anda — upload manual atau buat dengan AI</p>
      </div>

      <div className="cards-grid">
        <div className="form-card">
          <h3>
            <span className="material-symbols-outlined card-icon">upload_file</span>
            Tambah Materi Baru
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Judul Materi</label>
              <input name="title" placeholder="Contoh: Bab 1 — Pengenalan Aljabar" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Deskripsi</label>
              <textarea name="description" placeholder="Ringkasan singkat materi" rows="2" value={form.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Konten</label>
              <textarea name="content" placeholder="Isi materi (teks atau HTML)" rows="5" value={form.content} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Kelas</label>
                <select name="class_id" value={form.class_id} onChange={handleChange} required>
                  <option value="">Pilih Kelas</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Mata Pelajaran</label>
                <select name="subject_id" value={form.subject_id} onChange={handleChange} required>
                  <option value="">Pilih Mapel</option>
                  {teacherSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Link Eksternal</label>
              <input name="external_link" placeholder="YouTube, Google Drive, dll." value={form.external_link} onChange={handleChange} />
            </div>
            <div className="form-group file-input">
              <label>Lampiran File</label>
              <input type="file" onChange={handleFileChange} />
              {form.file && <span className="file-name">{form.file.name}</span>}
            </div>
            <button type="submit" className="btn-primary">Simpan Materi</button>
          </form>
        </div>

        <div className="form-card ai-card">
          <h3>
            <span className="material-symbols-outlined card-icon">auto_awesome</span>
            Buat Materi dengan AI
          </h3>
          <p className="ai-hint">Gunakan kelas & mapel yang sama dari form di sebelah kiri.</p>
          <div className="form-group">
            <label>Prompt AI</label>
            <textarea rows="4" placeholder="Contoh: Buat materi tentang persamaan linear dua variabel untuk kelas X..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Saran Judul (opsional)</label>
            <input placeholder="Judul yang diinginkan" value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} />
          </div>
          <button type="button" className="btn-ai" onClick={handleGenerateAI}>
            <span className="material-symbols-outlined">bolt</span>
            Generate dengan AI
          </button>
        </div>
      </div>

      <div className="materials-section">
        <h3>
          <span className="material-symbols-outlined section-icon">library_books</span>
          Materi yang Sudah Diupload
          <span className="count-badge">{materials.length}</span>
        </h3>

        {materials.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined empty-icon">folder_open</span>
            <p>Belum ada materi. Tambahkan materi baru menggunakan form di atas.</p>
          </div>
        ) : (
          <div className="materials-list">
            {materials.map(m => (
              <div 
                key={m._id} 
                className="material-card"
                onClick={(e) => {
                  // Prevent click if clicking on the action links directly
                  if(e.target.closest('.links a')) return;
                  
                  if (m.file_url) {
                    const url = m.file_url.startsWith('http') ? m.file_url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${m.file_url}`;
                    window.open(url, '_blank');
                  } else if (m.external_link) {
                    window.open(m.external_link, '_blank');
                  }
                }}
                style={{ cursor: (m.file_url || m.external_link) ? 'pointer' : 'default' }}
              >
                <div className="card-header">
                  <h4>{m.title}</h4>
                  <span className="badge">{m.subject_name}</span>
                </div>
                {m.description && <p className="desc">{m.description}</p>}
                {m.content && (
                  <div className="content-preview">{stripHtml(m.content)}</div>
                )}
                <div className="card-footer">
                  <div className="meta">
                    <span>
                      <span className="material-symbols-outlined meta-icon">school</span>
                      {m.class_name}
                    </span>
                    <span>
                      <span className="material-symbols-outlined meta-icon">menu_book</span>
                      {m.subject_name}
                    </span>
                  </div>
                  <div className="links">
                    {m.file_url && (
                      <a href={m.file_url.startsWith('http') ? m.file_url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${m.file_url}`} target="_blank" rel="noopener noreferrer">
                        <span className="material-symbols-outlined">attach_file</span>
                        Unduh Lampiran
                      </a>
                    )}
                    {m.external_link && (
                      <a href={m.external_link} target="_blank" rel="noopener noreferrer">
                        <span className="material-symbols-outlined">link</span>
                        Link Materi
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuruMaterials;
