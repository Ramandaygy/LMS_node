import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-materials.css';

const GuruMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterialModal, setSelectedMaterialModal] = useState(null);
  const [selectedPublishModal, setSelectedPublishModal] = useState(null);
  const [publishTargetClass, setPublishTargetClass] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    class_id: '',
    subject_id: '',
    external_link: '',
    file: null
  });
  const [editingId, setEditingId] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [materialFilter, setMaterialFilter] = useState('all');

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
      if (editingId) {
        await api.put(`/materials/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert('Materi berhasil diupdate');
      } else {
        await api.post('/materials', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert('Materi berhasil disimpan ke koleksi!');
      }
      setForm({ title: '', description: '', content: '', class_id: '', subject_id: '', external_link: '', file: null });
      setEditingId(null);
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal simpan materi');
    }
  };

  const handleEdit = (m) => {
    setForm({
      title: m.title || '',
      description: m.description || '',
      content: m.content || '',
      class_id: m.class_id || '',
      subject_id: m.subject_id || '',
      external_link: m.external_link || '',
      file: null
    });
    setEditingId(m._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus materi ini?')) {
      try {
        await api.delete(`/materials/${id}`);
        alert('Materi berhasil dihapus');
        fetchMaterials();
      } catch (err) {
        alert('Gagal menghapus materi');
      }
    }
  };

  const handleGenerateAIContent = async () => {
    if (!form.title) {
      alert('Silakan isi Judul Materi terlebih dahulu.');
      return;
    }
    if (!form.subject_id) {
      alert('Silakan pilih Mata Pelajaran terlebih dahulu.');
      return;
    }
    setGeneratingAI(true);
    try {
      const selectedSubject = teacherSubjects.find(s => s._id === form.subject_id);
      const selectedClass = teacherClasses.find(c => c._id === form.class_id);

      const res = await api.post('/materials/generate-ai', {
        title: form.title,
        description: form.description,
        subject_name: selectedSubject ? selectedSubject.name : 'Informatika',
        class_name: selectedClass ? selectedClass.name : 'Kelas',
        subject_id: form.subject_id,
        class_id: form.class_id
      });

      if (res.data.success && res.data.data) {
        setForm(prev => ({
          ...prev,
          description: res.data.data.description || prev.description,
          content: res.data.data.content || prev.content
        }));
        alert('Konten dan Deskripsi materi berhasil digenerate oleh AI!');
      }
    } catch (err) {
      console.error('Error generate AI material content:', err);
      alert('Gagal generate materi dengan AI');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Safe file download function for Base64 Data URIs & normal URLs
  const downloadFile = (fileUrl, fileName) => {
    if (!fileUrl) return;
    if (fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName || 'lampiran-materi';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${fileUrl}`;
      window.open(fullUrl, '_blank');
    }
  };

  // Handle assign/publish material to specific class
  const handleAssignToClass = async () => {
    if (!selectedPublishModal) return;
    try {
      const data = new FormData();
      data.append('class_id', publishTargetClass);
      await api.put(`/materials/${selectedPublishModal._id}`, data);
      alert('Materi berhasil dibagikan ke kelas target!');
      setSelectedPublishModal(null);
      fetchMaterials();
    } catch (err) {
      alert('Gagal membagikan materi ke kelas');
    }
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const filteredMaterials = materials.filter(m => {
    if (materialFilter === 'bank') return !m.class_id || m.class_name === 'Bank Materi';
    if (materialFilter === 'published') return m.class_id && m.class_name !== 'Bank Materi';
    return true;
  });

  if (loading) return <div className="loading">Memuat materi...</div>;

  return (
    <div className="guru-materials-container">
      <div className="page-header">
        <h1>Bank & Modul Materi Pembelajaran</h1>
        <p>Kumpulkan materi pembelajaran di Bank Materi, lalu bagikan ke kelas target secara terpusat.</p>
      </div>

      <div className="cards-grid">
        <div className="form-card">
          <h3>
            <span className="material-symbols-outlined card-icon">{editingId ? 'edit' : 'upload_file'}</span>
            {editingId ? 'Edit Materi' : 'Buat Materi Baru (Simpan ke Bank / Kelas)'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Judul Materi</label>
              <input name="title" placeholder="Contoh: Bab 1 — Pengenalan Bahasa Pemrograman" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Deskripsi / Ringkasan Materi</label>
              <textarea name="description" placeholder="Ringkasan singkat materi (atau klik Generate AI di bawah)" rows="2" value={form.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Isi / Konten Materi Pembelajaran</label>
              <textarea name="content" placeholder="Isi materi lengkap (teks/HTML, atau klik Generate AI di bawah)" rows="6" value={form.content} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Target Kelas (Bisa disimpan di Bank Materi)</label>
                <select name="class_id" value={form.class_id} onChange={handleChange}>
                  <option value="">📁 Simpan ke Bank Materi Guru (Semua Kelas)</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>Kelas {c.name}</option>)}
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
            <div className="form-group" style={{ background: '#eff6ff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
              <label style={{ color: '#1e40af', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563eb' }}>folder_shared</span>
                TAUTAN GOOGLE DRIVE GURU / CLOUD LINK
              </label>
              <input 
                name="external_link" 
                placeholder="https://drive.google.com/file/d/... atau Tautan Folder GDrive / YouTube" 
                value={form.external_link} 
                onChange={handleChange}
                style={{ background: '#ffffff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '9px 12px', fontSize: '13px' }} 
              />
            </div>
            <div className="form-group file-input">
              <label>Lampiran File (PDF / Dokumen)</label>
              <input type="file" onChange={handleFileChange} />
              {form.file && <span className="file-name">{form.file.name}</span>}
            </div>

            <div style={{ marginBottom: '16px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-ai-generate-content"
                onClick={handleGenerateAIContent}
                disabled={generatingAI}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>auto_awesome</span>
                {generatingAI ? 'Memproses Generasi AI...' : 'Generate Konten & Deskripsi dengan AI'}
              </button>
            </div>

            <div className="form-actions-row" style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px 20px', borderRadius: '12px', fontWeight: '800' }}>
                {editingId ? 'Update Materi' : 'Simpan Materi ke Koleksi'}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={() => {
                  setEditingId(null);
                  setForm({ title: '', description: '', content: '', class_id: '', subject_id: '', external_link: '', file: null });
                }} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: '700' }}>Batal</button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* FILTER TABS KOLEKSI MATERI */}
      <div className="filter-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setMaterialFilter('all')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: '1px solid #cbd5e1', background: materialFilter === 'all' ? '#0284c7' : '#fff', color: materialFilter === 'all' ? '#fff' : '#475569', fontWeight: '700', cursor: 'pointer' }}
        >
          Semua Koleksi ({materials.length})
        </button>
        <button 
          onClick={() => setMaterialFilter('bank')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: '1px solid #cbd5e1', background: materialFilter === 'bank' ? '#0284c7' : '#fff', color: materialFilter === 'bank' ? '#fff' : '#475569', fontWeight: '700', cursor: 'pointer' }}
        >
          📁 Bank Materi Guru
        </button>
        <button 
          onClick={() => setMaterialFilter('published')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: '1px solid #cbd5e1', background: materialFilter === 'published' ? '#0284c7' : '#fff', color: materialFilter === 'published' ? '#fff' : '#475569', fontWeight: '700', cursor: 'pointer' }}
        >
          🏫 Materi Per Kelas
        </button>
      </div>

      {/* DAFTAR MATERI */}
      <div className="materials-section">
        <h3>
          <span className="material-symbols-outlined section-icon">library_books</span>
          Koleksi & Bank Materi Pembelajaran
          <span className="count-badge">{filteredMaterials.length}</span>
        </h3>

        {filteredMaterials.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined empty-icon">folder_open</span>
            <p>Belum ada materi dalam koleksi ini.</p>
          </div>
        ) : (
          <div className="materials-list">
            {filteredMaterials.map(m => (
              <div 
                key={m._id} 
                className="material-card"
                onClick={() => setSelectedMaterialModal(m)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-header">
                  <h4>{m.title}</h4>
                  <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '800' }}>{m.subject_name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(m); }}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Edit Materi"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(m._id); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Hapus Materi"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                </div>
                {m.description && <p className="desc">{m.description}</p>}
                {m.content && (
                  <div className="content-preview">{stripHtml(m.content)}</div>
                )}
                
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div className="meta" style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                    <span>
                      <span className="material-symbols-outlined meta-icon" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>school</span>
                      {m.class_name || 'Bank Materi'}
                    </span>
                    <span>
                      <span className="material-symbols-outlined meta-icon" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>calendar_today</span>
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru'}
                    </span>
                  </div>

                  <div className="actions-right" style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedMaterialModal(m)}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span> Detail Isi Materi
                    </button>
                    <button 
                      onClick={() => { setSelectedPublishModal(m); setPublishTargetClass(m.class_id || ''); }}
                      style={{ background: '#0284c7', border: 'none', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span> Bagikan ke Kelas
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL POPUP DETAIL MATERI PEMBELAJARAN */}
      {selectedMaterialModal && (
        <div className="modal-backdrop" onClick={() => setSelectedMaterialModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', borderRadius: '20px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                  {selectedMaterialModal.subject_name} • {selectedMaterialModal.class_name || 'Bank Materi Guru'}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                  {selectedMaterialModal.title}
                </h3>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedMaterialModal(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', display: 'flex', gap: '16px' }}>
                <span>📅 <strong>Diupload:</strong> {selectedMaterialModal.createdAt ? new Date(selectedMaterialModal.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Terbaru'}</span>
              </div>

              {selectedMaterialModal.description && (
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '4px' }}>Deskripsi Ringkas:</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{selectedMaterialModal.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '8px' }}>Isi / Konten Materi Pembelajaran:</strong>
                <div 
                  style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', lineHeight: '1.6', maxHeight: '350px', overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: selectedMaterialModal.content || '<p>Tidak ada teks konten tambahan.</p>' }}
                />
              </div>

              {/* LAMPIRAN FILE / LINK DENGAN SAFE DOWNLOAD HELPER */}
              {(selectedMaterialModal.file_url || selectedMaterialModal.external_link) && (
                <div style={{ background: '#eff6ff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Lampiran & Tautan Materi:</strong>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {selectedMaterialModal.file_url && (
                      <button 
                        onClick={() => downloadFile(selectedMaterialModal.file_url, selectedMaterialModal.file_name || selectedMaterialModal.title)}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Unduh Lampiran File
                      </button>
                    )}
                    {selectedMaterialModal.external_link && (
                      <a 
                        href={selectedMaterialModal.external_link} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ background: '#10b981', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span> Buka Tautan Link / Google Drive
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn-cancel" onClick={() => setSelectedMaterialModal(null)} style={{ padding: '8px 20px', borderRadius: '10px' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP BAGIKAN KE KELAS TARGET */}
      {selectedPublishModal && (
        <div className="modal-backdrop" onClick={() => setSelectedPublishModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-outlined">send</span>
                Bagikan Materi ke Kelas
              </h3>
              <button className="btn-close-modal" onClick={() => setSelectedPublishModal(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Pilih kelas target untuk mempublikasikan materi <strong>"{selectedPublishModal.title}"</strong>:
              </p>
              <div className="form-group">
                <label>Target Kelas</label>
                <select value={publishTargetClass} onChange={(e) => setPublishTargetClass(e.target.value)} style={{ padding: '10px', borderRadius: '10px', width: '100%' }}>
                  <option value="">📁 Simpan di Bank Materi Guru (Semua Kelas)</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>Kelas {c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justify: 'flex-end', gap: '10px' }}>
              <button className="btn-cancel" onClick={() => setSelectedPublishModal(null)}>Batal</button>
              <button className="btn-submit" onClick={handleAssignToClass} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Publikasikan ke Kelas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuruMaterials;
