import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/admin';
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

  const fetchAcademicYears = async () => {
    try {
      const response = await adminService.getAcademicYears();
      setAcademicYears(response.academic_years || []);
    } catch (error) {
      console.error(error);
      setError('Gagal memuat data tahun ajaran');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await adminService.getClassOptions();
      setAllClasses(response.classes || []);
    } catch (error) {
      console.error('Gagal memuat daftar kelas', error);
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
        await adminService.updateAcademicYear(editingYear._id, formData);
        setSuccess('Tahun ajaran berhasil diupdate');
      } else {
        await adminService.createAcademicYear(formData);
        setSuccess('Tahun ajaran berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingYear(null);
      setFormData({ year: '', start_date: '', end_date: '', is_active: true, semester: '' });
      fetchAcademicYears();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal menyimpan data');
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
        await adminService.deleteAcademicYear(id);
        setSuccess('Tahun ajaran berhasil dihapus');
        fetchAcademicYears();
      } catch (error) {
        setError('Gagal menghapus tahun ajaran');
      }
    }
  };

  // ========== KENAIKAN KELAS ==========
  const openPromoteModal = (year) => {
    setPromoteModal({ open: true, yearId: year._id, yearName: year.year });
    setSourceClass('');
    setStudentsForPromotion([]);
  };

  const loadStudentsForPromotion = async () => {
    if (!sourceClass) return;
    setPromotionLoading(true);
    try {
      const response = await adminService.getStudentsByClassForPromotion(promoteModal.yearId, sourceClass);
      const students = (response.students || []).map(s => ({ ...s, newClass: '' }));
      setStudentsForPromotion(students);
    } catch (error) {
      setError('Gagal mengambil data siswa');
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleNewClassChange = (index, newClass) => {
    const updated = [...studentsForPromotion];
    updated[index].newClass = newClass;
    setStudentsForPromotion(updated);
  };

  const handlePromote = async () => {
    const promotions = studentsForPromotion
      .filter(s => s.newClass && s.newClass !== s.class)
      .map(s => ({ student_id: s._id, new_class: s.newClass }));
    if (promotions.length === 0) {
      setError('Tidak ada perubahan kelas yang dipilih');
      return;
    }
    if (!window.confirm(`Promosikan ${promotions.length} siswa ke kelas baru?`)) return;
    setPromotionLoading(true);
    try {
      await adminService.promoteStudents(promoteModal.yearId, { promotions, note: `Kenaikan kelas ${promoteModal.yearName}` });
      setSuccess('Kenaikan kelas berhasil');
      setPromoteModal({ open: false, yearId: null, yearName: '' });
      fetchAcademicYears();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal melakukan kenaikan kelas');
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
      const response = await adminService.getAlumniByYear(year._id);
      setAlumniList(response.alumni || []);
    } catch (error) {
      setError('Gagal mengambil data alumni');
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

      {/* MODAL TAMBAH/EDIT TAHUN AJARAN */}
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

      {/* MODAL KENAIKAN KELAS */}
      {promoteModal.open && (
        <div className="modal-overlay" onClick={() => setPromoteModal({ open: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Kenaikan Kelas - {promoteModal.yearName}</h3>
            <div className="form-row">
              <select value={sourceClass} onChange={e => setSourceClass(e.target.value)}>
                <option value="">Pilih Kelas Asal</option>
                {allClasses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
              <button onClick={loadStudentsForPromotion} disabled={!sourceClass}>Ambil Siswa</button>
            </div>
            {promotionLoading && <div className="loading-spinner">Memuat...</div>}
            {studentsForPromotion.length > 0 && (
              <div className="promotion-table-container">
                <table className="promotion-table">
                  <thead><tr><th>Nama</th><th>NIS</th><th>Kelas Asal</th><th>Kelas Tujuan</th></tr></thead>
                  <tbody>
                    {studentsForPromotion.map((s, idx) => (
                      <tr key={s._id}>
                        <td>{s.full_name}</td>
                        <td>{s.nis}</td>
                        <td>{s.class}</td>
                        <td>
                          <select value={s.newClass} onChange={e => handleNewClassChange(idx, e.target.value)}>
                            <option value="">-- Pilih Kelas Baru --</option>
                            {allClasses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-buttons">
              <button onClick={() => setPromoteModal({ open: false })}>Batal</button>
              <button onClick={handlePromote} disabled={promotionLoading}>Simpan Promosi</button>
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