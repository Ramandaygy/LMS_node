import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-materials.css';

const GuruMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterialModal, setSelectedMaterialModal] = useState(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  
  // Batch selection states
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributeTargetClass, setDistributeTargetClass] = useState('');
  const [distributing, setDistributing] = useState(false);

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

  useEffect(() => {
    fetchProfile();
    fetchMaterials();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      setTeacherSubjects(res.data.subjects || []);
      setTeacherClasses(res.data.classes || []);
      if (res.data.subjects && res.data.subjects.length > 0 && !form.subject_id) {
        setForm(prev => ({ ...prev, subject_id: res.data.subjects[0]._id }));
      }
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
    const finalDesc = form.description || `Materi pembelajaran mengenai ${form.title}.`;
    const finalContent = form.content || `<h3>Pembahasan Utama: ${form.title}</h3><p>Materi pembelajaran sekolah mengenai <strong>${form.title}</strong>.</p><h4>1. Pengertian & Konsep Dasar</h4><p>Penjelasan mengenai definisi dasar dan pentingnya mempelajari ${form.title}.</p><h4>2. Uraian Teori & Contoh Praktis</h4><p>Pembahasan terstruktur mengenai bab ini.</p>`;

    const data = new FormData();
    data.append('title', form.title);
    data.append('description', finalDesc);
    data.append('content', finalContent);
    data.append('class_id', form.class_id || '');
    data.append('subject_id', form.subject_id || (teacherSubjects[0]?._id || ''));
    data.append('external_link', form.external_link || '');
    // Materi baru disimpan ke Bank Materi terlebih dahulu (Draft), tidak langsung terdistribusi ke siswa
    data.append('is_published', 'false');
    if (form.file) data.append('file', form.file);

    try {
      if (editingId) {
        await api.put(`/materials/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert('Materi berhasil diupdate');
      } else {
        await api.post('/materials', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert('Materi berhasil disimpan');
      }
      setForm({ title: '', description: '', content: '', class_id: '', subject_id: teacherSubjects[0]?._id || '', external_link: '', file: null });
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

  // Generate AI Content Flow
  const handleGenerateAIContent = async () => {
    if (!form.title) {
      alert('Silakan isi Judul Materi terlebih dahulu.');
      return;
    }
    setGeneratingAI(true);
    try {
      const selectedSubject = teacherSubjects.find(s => s._id === form.subject_id) || teacherSubjects[0];
      const selectedClass = teacherClasses.find(c => c._id === form.class_id);

      const res = await api.post('/materials/generate-ai', {
        title: form.title,
        description: form.description,
        subject_name: selectedSubject ? selectedSubject.name : 'Informatika',
        class_name: selectedClass ? selectedClass.name : 'Kelas',
        subject_id: form.subject_id || (selectedSubject?._id || ''),
        class_id: form.class_id
      });

      const aiData = res.data?.data || res.data;

      if (aiData) {
        const generatedDesc = aiData.description || `Ringkasan materi pembelajaran ${form.title}.`;
        const generatedContent = aiData.content || `<h3>${form.title}</h3><p>Materi pembelajaran mengenai ${form.title}.</p>`;

        setForm(prev => ({
          ...prev,
          description: generatedDesc,
          content: generatedContent,
          subject_id: prev.subject_id || (selectedSubject?._id || '')
        }));
        alert('Konten dan Deskripsi materi berhasil dihasilkan oleh AI! Silakan periksa dan simpan.');
      }
    } catch (err) {
      console.error('Error generate AI material content:', err);
      alert('Gagal generate materi dengan AI. Menggunakan template AI default...');
      setForm(prev => ({
        ...prev,
        description: prev.description || `Ringkasan materi pembelajaran ${form.title}.`,
        content: prev.content || `<h3>Pembahasan ${form.title}</h3><p>Materi pembelajaran terstruktur untuk topik ${form.title}.</p>`
      }));
    } finally {
      setGeneratingAI(false);
    }
  };

  // Safe file downloader (only triggered on explicit user click)
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

  const renderMultiSlideContent = (content) => {
    if (!content) return <p>Tidak ada teks konten tambahan.</p>;

    let slides = content.split(/<!--\s*slide-break\s*-->/i).map(s => s.trim()).filter(Boolean);

    if (slides.length <= 1) {
      const matchSlideDivs = content.match(/<div class="material-slide">[\s\S]*?<\/div>/gi);
      if (matchSlideDivs && matchSlideDivs.length > 1) {
        slides = matchSlideDivs;
      }
    }

    if (slides.length <= 1) {
      return (
        <div 
          style={{ background: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    const currentSlideHtml = slides[activeSlideIdx] || slides[0];

    return (
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>slideshow</span>
            Presentasi Slide ({activeSlideIdx + 1} dari {slides.length})
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlideIdx(idx)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: 'none',
                  background: activeSlideIdx === idx ? '#0284c7' : '#cbd5e1',
                  color: activeSlideIdx === idx ? '#ffffff' : '#475569',
                  fontWeight: '800',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div 
          style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '220px', fontSize: '14px', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: currentSlideHtml }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <button
            onClick={() => setActiveSlideIdx(prev => Math.max(0, prev - 1))}
            disabled={activeSlideIdx === 0}
            style={{
              background: activeSlideIdx === 0 ? '#f1f5f9' : '#ffffff',
              color: activeSlideIdx === 0 ? '#94a3b8' : '#0284c7',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '12px',
              cursor: activeSlideIdx === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
            Slide Sebelumnya
          </button>

          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
            Slide {activeSlideIdx + 1} / {slides.length}
          </span>

          <button
            onClick={() => setActiveSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={activeSlideIdx === slides.length - 1}
            style={{
              background: activeSlideIdx === slides.length - 1 ? '#f1f5f9' : '#0284c7',
              color: activeSlideIdx === slides.length - 1 ? '#94a3b8' : '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '12px',
              cursor: activeSlideIdx === slides.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Slide Selanjutnya
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </button>
        </div>
      </div>
    );
  };

  // Safe Inline Previewer that NEVER causes Chrome to auto-download!
  const renderFilePreview = (m) => {
    if (!m) return null;
    const fileUrl = m.file_url;
    const extLink = m.external_link;

    if (fileUrl) {
      const isImage = fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
      const isPdf = fileUrl.startsWith('data:application/pdf') || /\.pdf$/i.test(fileUrl);
      const fullUrl = fileUrl.startsWith('http') || fileUrl.startsWith('data:') ? fileUrl : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${fileUrl}`;

      return (
        <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>attach_file</span>
              Lampiran File: {m.file_name || 'Dokumen Materi'}
            </strong>
            <button 
              onClick={() => downloadFile(fileUrl, m.file_name || m.title)}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> Unduh File
            </button>
          </div>

          {isImage ? (
            <div style={{ textAlign: 'center' }}>
              <img src={fullUrl} alt="Pratinjau Dokumen Materi" style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '10px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />
            </div>
          ) : isPdf ? (
            <iframe 
              src={fullUrl} 
              title="Pratinjau PDF Dokumen" 
              style={{ width: '100%', height: '420px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}
            />
          ) : (
            /* NON-PDF / ODT / DOC FILES: Render info box without iframe to prevent Chrome auto-download */
            <div style={{ padding: '20px', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#0284c7' }}>description</span>
              <p style={{ margin: '8px 0 4px 0', fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{m.file_name || 'Dokumen Materi'}</p>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>Klik tombol di bawah jika Anda ingin mengunduh dan membaca file ini di perangkat Anda.</p>
              <button 
                onClick={() => downloadFile(fileUrl, m.file_name || m.title)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Unduh Dokumen
              </button>
            </div>
          )}
        </div>
      );
    }

    if (extLink) {
      let embedSrc = extLink;
      if (extLink.includes('drive.google.com') || extLink.includes('docs.google.com')) {
        embedSrc = extLink.replace(/\/view(\?.*)?$/, '/preview');
      }

      return (
        <div style={{ marginTop: '16px', background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>folder_shared</span>
              Tautan Google Drive / Cloud
            </strong>
            <a 
              href={extLink} 
              target="_blank" 
              rel="noreferrer"
              style={{ background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span> Buka Tab Baru
            </a>
          </div>
          <iframe 
            src={embedSrc} 
            title="Pratinjau Google Drive External" 
            style={{ width: '100%', height: '420px', border: '1px solid #a7f3d0', borderRadius: '10px', background: '#ffffff' }}
          />
        </div>
      );
    }

    return null;
  };

  // Checkbox selection
  const handleToggleSelect = (id) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMaterialIds(materials.map(m => m._id));
    } else {
      setSelectedMaterialIds([]);
    }
  };

  // Batch Distribution Logic
  const handleBatchDistributeSubmit = async () => {
    if (selectedMaterialIds.length === 0) {
      alert('Pilih minimal 1 materi untuk didistribusikan');
      return;
    }
    if (!distributeTargetClass) {
      alert('Pilih kelas target distribusi');
      return;
    }

    setDistributing(true);
    try {
      const res = await api.post('/materials/distribute-batch', {
        material_ids: selectedMaterialIds,
        class_id: distributeTargetClass
      });

      if (res.data.success) {
        alert(`Berhasil mendistribusikan ${selectedMaterialIds.length} materi ke kelas target!`);
        setShowDistributeModal(false);
        setSelectedMaterialIds([]);
        fetchMaterials();
      }
    } catch (err) {
      console.error('Distribute batch err:', err);
      alert(err.response?.data?.message || 'Gagal mendistribusikan materi');
    } finally {
      setDistributing(false);
    }
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const selectedMaterialsList = materials.filter(m => selectedMaterialIds.includes(m._id));

  if (loading) return <div className="loading">Memuat materi...</div>;

  return (
    <div className="guru-materials-container">
      <div className="page-header">
        <h1>Materi Pembelajaran</h1>
        <p>Kelola koleksi materi pembelajaran, gunakan AI untuk membuat konten, dan distribusikan ke kelas target.</p>
      </div>

      {/* FORM PEMBUATAN MATERI */}
      <div className="cards-grid">
        <div className="form-card">
          <h3>
            <span className="material-symbols-outlined card-icon">{editingId ? 'edit' : 'upload_file'}</span>
            {editingId ? 'Edit Materi' : 'Tambah Materi Baru'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Judul Materi</label>
              <input name="title" placeholder="Contoh: Bab 1 — Pengenalan Bahasa Pemrograman" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Deskripsi</label>
              <textarea name="description" placeholder="Ringkasan singkat materi (atau klik Generate AI di bawah)" rows="2" value={form.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Konten Materi</label>
              <textarea name="content" placeholder="Isi materi lengkap (teks atau HTML, atau klik Generate AI di bawah)" rows="6" value={form.content} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Kelas</label>
                <select name="class_id" value={form.class_id} onChange={handleChange}>
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
              <span style={{ fontSize: '11px', color: '#2563eb', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>lightbulb</span>
                Guru dapat memasukkan tautan file/folder Google Drive pribadi untuk menghemat kapasitas penyimpanan.
              </span>
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
                {editingId ? 'Update Materi' : 'Simpan Materi'}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={() => {
                  setEditingId(null);
                  setForm({ title: '', description: '', content: '', class_id: '', subject_id: teacherSubjects[0]?._id || '', external_link: '', file: null });
                }} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: '700' }}>Batal</button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* BATCH ACTION STRIP DENGAN CEKLIS TANPA EMOJI */}
      <div className="batch-action-bar" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '14px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#0f172a' }}>
            <input 
              type="checkbox" 
              onChange={handleSelectAll} 
              checked={materials.length > 0 && selectedMaterialIds.length === materials.length}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            Pilih Semua Materi
          </label>
          <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: '800' }}>
            {selectedMaterialIds.length} Terpilih
          </span>
        </div>

        <button 
          onClick={() => {
            if (selectedMaterialIds.length === 0) {
              alert('Pilih minimal 1 materi untuk didistribusikan ke kelas!');
              return;
            }
            setShowDistributeModal(true);
          }}
          disabled={selectedMaterialIds.length === 0}
          style={{
            background: selectedMaterialIds.length > 0 ? '#16a34a' : '#cbd5e1',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: selectedMaterialIds.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: selectedMaterialIds.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          Distribusikan Materi Terpilih ke Kelas
        </button>
      </div>

      {/* DAFTAR KOLEKSI MATERI LENGKAP */}
      <div className="materials-section">
        <h3>
          <span className="material-symbols-outlined section-icon">library_books</span>
          Koleksi & Bank Materi Pembelajaran
          <span className="count-badge">{materials.length}</span>
        </h3>

        {materials.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined empty-icon">folder_open</span>
            <p>Belum ada materi. Tambahkan materi baru menggunakan form di atas.</p>
          </div>
        ) : (
          <div className="materials-list">
            {materials.map(m => {
              const isChecked = selectedMaterialIds.includes(m._id);
              const isDistributed = m.class_id && m.class_name && m.class_name !== 'Bank Materi';

              return (
                <div 
                  key={m._id} 
                  className={`material-card ${isChecked ? 'selected-card-border' : ''}`}
                  onClick={() => setSelectedMaterialModal(m)}
                  style={{ 
                    cursor: 'pointer',
                    position: 'relative',
                    borderLeft: isChecked ? '5px solid #16a34a' : '1px solid #e0e3e5',
                    background: isChecked ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div className="card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    
                    {/* CHECKBOX SELECTION */}
                    <div onClick={(e) => e.stopPropagation()} style={{ paddingTop: '2px' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => handleToggleSelect(m._id)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800' }}>{m.title}</h4>
                      <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '800' }}>{m.subject_name}</span>
                        {isDistributed ? (
                          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span> {m.class_name}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>folder</span> Bank Materi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="header-actions-right" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleEdit(m)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Edit Materi"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(m._id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Hapus Materi"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  </div>

                  {m.description && <p className="desc" style={{ marginTop: '10px', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{m.description}</p>}
                  {m.content && (
                    <div className="content-preview" style={{ marginTop: '8px', background: '#fafafa', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '12px', color: '#334155' }}>
                      {stripHtml(m.content)}
                    </div>
                  )}
                  
                  <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <div className="meta" style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span>
                        <span className="material-symbols-outlined meta-icon" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>calendar_today</span>
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru'}
                      </span>
                    </div>

                    <div className="actions-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setSelectedMaterialModal(m)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span> Detail Isi Materi
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL POPUP BATCH DISTRIBUSI MATERI */}
      {showDistributeModal && (
        <div className="modal-backdrop" onClick={() => setShowDistributeModal(false)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-outlined">send</span>
                Distribusi {selectedMaterialIds.length} Materi ke Kelas Target
              </h3>
              <button className="btn-close-modal" onClick={() => setShowDistributeModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Pilih kelas target untuk mengirimkan <strong>{selectedMaterialIds.length} materi terpilih</strong>:
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Target Kelas Tujuan</label>
                <select value={distributeTargetClass} onChange={(e) => setDistributeTargetClass(e.target.value)} style={{ padding: '10px 12px', borderRadius: '10px', width: '100%', fontSize: '14px', border: '1px solid #cbd5e1' }} required>
                  <option value="">-- Pilih Kelas Target --</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>Kelas {c.name}</option>)}
                </select>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '12px', color: '#334155', display: 'block', marginBottom: '8px' }}>Daftar Materi yang Akan Dikirim:</strong>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#0f172a' }}>
                  {selectedMaterialsList.map(m => (
                    <li key={m._id} style={{ marginBottom: '4px' }}>
                      <strong>{m.title}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>({m.subject_name})</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-cancel" onClick={() => setShowDistributeModal(false)}>Batal</button>
              <button 
                className="btn-submit" 
                onClick={handleBatchDistributeSubmit} 
                disabled={distributing}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                {distributing ? 'Mendistribusikan...' : 'Kirim Sekarang ke Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP DETAIL & PRATINJAU DOKUMEN MATERI */}
      {selectedMaterialModal && (
        <div className="modal-backdrop" onClick={() => setSelectedMaterialModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', borderRadius: '20px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                  {selectedMaterialModal.subject_name} • {selectedMaterialModal.class_name || 'Bank Materi'}
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
                <span><span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>calendar_today</span> Diupload: {selectedMaterialModal.createdAt ? new Date(selectedMaterialModal.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Terbaru'}</span>
              </div>

              {selectedMaterialModal.description && (
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '4px' }}>Deskripsi Ringkas:</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{selectedMaterialModal.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Isi / Konten Materi Pembelajaran Interaktif (Slide Presentation):
                </strong>
                {renderMultiSlideContent(selectedMaterialModal.content)}
              </div>

              {/* SAFE INLINE PREVIEWER THAT NEVER AUTO-DOWNLOADS */}
              {renderFilePreview(selectedMaterialModal)}
            </div>

            <div className="modal-footer" style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn-cancel" onClick={() => setSelectedMaterialModal(null)} style={{ padding: '8px 20px', borderRadius: '10px' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuruMaterials;
