import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-academic.css';

const AdminAcademicYear = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({
    year: '',
    start_date: '',
    end_date: '',
    is_active: true,
    semester: ''
  });

  // Modal kenaikan kelas
  const [promoteModal, setPromoteModal] = useState({ open: false, yearId: null, yearName: '' });
  const [sourceClass, setSourceClass] = useState('');
  const [studentsForPromotion, setStudentsForPromotion] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [promotionLoading, setPromotionLoading] = useState(false);

  // Modal alumni
  const [alumniModal, setAlumniModal] = useState({ open: false, yearId: null, yearName: '' });
  const [alumniList, setAlumniList] = useState([]);
  const [alumniLoading, setAlumniLoading] = useState(false);

  useEffect(() => {
    fetchAcademicYears();
    fetchClasses();
  }, []);

  // ======================================
  // 1. Ambil daftar tahun ajaran
  // ======================================
  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/academic-years');
      // response.data diharapkan berbentuk { success: true, academic_years: [...] }
      setAcademicYears(response.data.academic_years || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data tahun ajaran');
    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // 2. Ambil daftar kelas (untuk keperluan kenaikan kelas)
  // ======================================
  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      // response.data.data adalah array kelas
      const classes = response.data.data || [];
      setAllClasses(classes);
    } catch (err) {
      console.error('Gagal memuat daftar kelas', err);
      // Jangan tampilkan error ke user karena fitur ini tidak utama
    }
  };

  // ========== CRUD TAHUN AJARAN ==========
  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingYear) {
        await api.put(`/academic-years/${editingYear._id}`, formData);
        setSuccess('Tahun ajaran berhasil diupdate');
      } else {
        await api.post('/academic-years', formData);
        setSuccess('Tahun ajaran berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingYear(null);
      setFormData({ year: '', start_date: '', end_date: '', is_active: true, semester: '' });
      fetchAcademicYears();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (year) => {
    setEditingYear(year);
    setFormData({
      year: year.year,
      start_date: year.start_date?.split('T')[0] || '',
      end_date: year.end_date?.split('T')[0] || '',
      is_active: year.is_active,
      semester: year.semester || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tahun ajaran ini?')) {
      try {
        await api.delete(`/academic-years/${id}`);
        setSuccess('Tahun ajaran berhasil dihapus');
        fetchAcademicYears();
      } catch (err) {
        setError('Gagal menghapus tahun ajaran');
      }
    }
  };

  // ========== KENAIKAN KELAS (sementara, karena backend mungkin belum siap) ==========
  const openPromoteModal = (year) => {
    setPromoteModal({ open: true, yearId: year._id, yearName: year.year });
    setSourceClass('');
    setStudentsForPromotion([]);
  };

  const loadStudentsForPromotion = async () => {
    // This function is no longer needed since promotion is automatic
  };

  const handleNewClassChange = (index, newClass) => {
    const updated = [...studentsForPromotion];
    updated[index].newClass = newClass;
    setStudentsForPromotion(updated);
  };

  const handlePromote = async () => {
    if (!window.confirm(`PERINGATAN: Tindakan ini akan menaikkan kelas semua siswa aktif secara acak ke kelas tingkat berikutnya, dan meluluskan siswa kelas akhir ke tahun ajaran ${promoteModal.yearName}. Tindakan ini tidak bisa dibatalkan secara otomatis. Lanjutkan?`)) return;
    setPromotionLoading(true);
    try {
      const response = await api.post(`/academic-years/${promoteModal.yearId}/promote`);
      const { data } = response.data;
      setSuccess(`Berhasil! ${data.promotedTo8} siswa naik ke kelas 8, ${data.promotedTo9} siswa naik ke kelas 9, dan ${data.graduated} siswa lulus.`);
      setPromoteModal({ open: false, yearId: null, yearName: '' });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal melakukan kenaikan kelas');
    } finally {
      setPromotionLoading(false);
    }
  };

  // ========== ALUMNI ==========
  const openAlumniModal = async (year) => {
    setAlumniModal({ open: true, yearId: year._id, yearName: year.year });
    setAlumniList([]);
    setAlumniLoading(true);
    try {
      const response = await api.get(`/academic-years/${year._id}/alumni`);
      setAlumniList(response.data.alumni || []);
    } catch (err) {
      setError('Gagal memuat data alumni');
    } finally {
      setAlumniLoading(false);
    }
  };

  if (loading && academicYears.length === 0) {
    return <div className="academic-loading">Memuat data...</div>;
  }

  return (
    <div className="academic-container">
      <div className="academic-header">
        <div>
          <h2>📅 Tahun Ajaran</h2>
          <p>Kelola tahun ajaran, kenaikan kelas, dan alumni</p>
        </div>
        <button className="btn-add" onClick={() => { setEditingYear(null); setFormData({ year: '', start_date: '', end_date: '', is_active: true, semester: '' }); setShowModal(true); }}>
          + Tambah Tahun Ajaran
        </button>
      </div>

      {error && <div className="academic-alert error">{error}<button onClick={() => setError('')}>×</button></div>}
      {success && <div className="academic-alert success">{success}<button onClick={() => setSuccess('')}>×</button></div>}

      <div className="academic-table-wrapper">
        <table className="academic-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Tahun Ajaran</th>
              <th>Semester</th>
              <th>Tanggal Mulai</th>
              <th>Tanggal Selesai</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {academicYears.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-message">Belum ada data tahun ajaran</td>
              </tr>
            ) : (
              academicYears.map((year, idx) => (
                <tr key={year._id} className={year.is_active ? 'current-row' : ''}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{year.year}</strong>
                    {year.is_active && <span className="current-badge">Aktif</span>}
                  </td>
                  <td>{year.semester || '-'}</td>
                  <td>{year.start_date ? new Date(year.start_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td>{year.end_date ? new Date(year.end_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td>
                    <span className={`status-badge ${year.is_active ? 'active' : 'inactive'}`}>
                      {year.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="academic-actions">
                    <button className="btn-edit" onClick={() => handleEdit(year)}>✏️ Edit</button>
                    <button className="btn-promote" onClick={() => openPromoteModal(year)}>📈 Kenaikan Kelas</button>
                    <button className="btn-alumni" onClick={() => openAlumniModal(year)}>🎓 Alumni</button>
                    <button className="btn-delete" onClick={() => handleDelete(year._id)}>🗑️ Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH/EDIT TAHUN AJARAN (sama seperti sebelumnya) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Tahun Ajaran (contoh: 2025/2026) *</label>
                <input type="text" name="year" value={formData.year} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <select name="semester" value={formData.semester} onChange={handleChange}>
                  <option value="">Pilih Semester</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tanggal Mulai</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Tanggal Selesai</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                  Aktif
                </label>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" disabled={loading}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KENAIKAN KELAS AUTO */}
      {promoteModal.open && (
        <div className="modal-overlay" onClick={() => setPromoteModal({ open: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Kenaikan Kelas - {promoteModal.yearName}</h3>
            <div className="alert-warning" style={{ padding: '15px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '8px', marginBottom: '20px' }}>
              <strong>Peringatan!</strong> Sistem akan:
              <ul style={{ margin: '10px 0 0 20px' }}>
                <li>Mengacak dan menaikkan siswa Kelas 7 ke Kelas 8 secara merata.</li>
                <li>Mengacak dan menaikkan siswa Kelas 8 ke Kelas 9 secara merata.</li>
                <li>Meluluskan seluruh siswa Kelas 9 (menjadi Alumni di tahun ajaran ini).</li>
              </ul>
              <br/>
              <em>Pastikan semua kelas tujuan (Kelas 8 dan 9) sudah dibuat di menu Data Master.</em>
            </div>
            
            {promotionLoading && <div className="loading-spinner" style={{ textAlign: 'center', marginBottom: '20px' }}>Sedang memproses... mohon tunggu.</div>}
            
            <div className="modal-buttons">
              <button onClick={() => setPromoteModal({ open: false })}>Batal</button>
              <button onClick={handlePromote} disabled={promotionLoading} style={{ backgroundColor: '#dc3545' }}>Proses Sekarang</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALUMNI */}
      {alumniModal.open && (
        <div className="modal-overlay" onClick={() => setAlumniModal({ open: false })}>
          <div className="modal-content alumni-modal" onClick={e => e.stopPropagation()}>
            <h3>Alumni - {alumniModal.yearName}</h3>
            {alumniLoading ? <div className="loading-spinner">Memuat...</div> : (
              <div className="alumni-list">
                {alumniList.length === 0 ? (
                  <p className="empty-message">Belum ada alumni tahun ini</p>
                ) : (
                  <table className="alumni-table">
                    <thead><tr><th>Nama</th><th>NIS</th><th>Kelas Lulus</th></tr></thead>
                    <tbody>
                      {alumniList.map(a => (
                        <tr key={a._id}>
                          <td>{a.full_name}</td>
                          <td>{a.nis}</td>
                          <td>{a.graduated_from_class || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className="modal-buttons">
              <button onClick={() => setAlumniModal({ open: false })}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademicYear;