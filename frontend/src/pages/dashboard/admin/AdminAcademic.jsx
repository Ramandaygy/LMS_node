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
    grade_input_start_date: '',
    grade_input_end_date: '',
    is_active: true,
    semester: ''
  });

  // Modal kenaikan kelas - WIZARD VERSION
  const [promoteModal, setPromoteModal] = useState({ open: false, yearId: null, yearName: '', semester: '' });
  const [promotionWizard, setPromotionWizard] = useState({
    step: 1,
    sourceClassId: '',
    sourceClassName: '',
    targetClassId: '',
    targetClassName: '',
    students: [],
    selectedStudentIds: [],
    allStudents: []
  });
  const [allClasses, setAllClasses] = useState([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [classStudentsMap, setClassStudentsMap] = useState({});
  const [selectAll, setSelectAll] = useState(true);

  // Modal alumni
  const [alumniModal, setAlumniModal] = useState({ open: false, yearId: null, yearName: '' });
  const [alumniList, setAlumniList] = useState([]);
  const [alumniLoading, setAlumniLoading] = useState(false);

  // Modal detail alumni
  const [detailAlumniModal, setDetailAlumniModal] = useState({
    open: false,
    student: null,
    grades: [],
    loading: false
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  useEffect(() => {
    fetchAcademicYears();
    fetchClasses();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/academic-years');
      setAcademicYears(response.data.academic_years || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data tahun ajaran');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const classes = response.data.data || [];
      setAllClasses(classes);
    } catch (err) {
      console.error('Gagal memuat daftar kelas', err);
    }
  };

  const fetchStudentsByClass = async (classId) => {
    if (!classId) return [];
    try {
      const response = await api.get(`/attendance/students/${classId}`);
      return response.data.students || [];
    } catch (err) {
      console.error('Gagal memuat siswa kelas', err);
      return [];
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
      setFormData({ year: '', start_date: '', end_date: '', grade_input_start_date: '', grade_input_end_date: '', is_active: true, semester: '' });
      fetchAcademicYears();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (year) => {
    setEditingYear(year);
    const parseDate = (d) => {
      if (!d) return '';
      if (typeof d === 'string') return d.split('T')[0];
      try {
        return new Date(d).toISOString().split('T')[0];
      } catch (err) {
        return '';
      }
    };
    setFormData({
      year: year.year || year.name || '',
      start_date: parseDate(year.start_date),
      end_date: parseDate(year.end_date),
      grade_input_start_date: parseDate(year.grade_input_start_date),
      grade_input_end_date: parseDate(year.grade_input_end_date),
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

  // ========== KENAIKAN KELAS - WIZARD ==========
  const openPromoteModal = (year) => {
    setPromoteModal({
      open: true,
      yearId: year._id,
      yearName: year.year,
      semester: year.semester || 'Ganjil'
    });
    setPromotionWizard({
      step: 1,
      sourceClassId: '',
      sourceClassName: '',
      targetClassId: '',
      targetClassName: '',
      students: [],
      selectedStudentIds: [],
      allStudents: []
    });
    setSelectAll(true);
  };

  const handleWizardNext = () => {
    setPromotionWizard(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const handleWizardBack = () => {
    setPromotionWizard(prev => ({ ...prev, step: prev.step - 1 }));
  };

  const handleSourceClassSelect = async (classId) => {
    const selected = allClasses.find(c => c._id === classId);
    const students = await fetchStudentsByClass(classId);
    const allStudentIds = students.map(s => s._id || s.id);
    setPromotionWizard(prev => ({
      ...prev,
      sourceClassId: classId,
      sourceClassName: selected?.name || '',
      students: students,
      allStudents: students,
      selectedStudentIds: selectAll ? allStudentIds : []
    }));
  };

  const handleTargetClassSelect = (classId) => {
    const selected = allClasses.find(c => c._id === classId);
    setPromotionWizard(prev => ({
      ...prev,
      targetClassId: classId,
      targetClassName: selected?.name || (classId === 'LULUS' ? 'LULUS' : '')
    }));
  };

  const handleToggleStudent = (studentId) => {
    setPromotionWizard(prev => {
      const isSelected = prev.selectedStudentIds.includes(studentId);
      const newSelected = isSelected
        ? prev.selectedStudentIds.filter(id => id !== studentId)
        : [...prev.selectedStudentIds, studentId];
      return { ...prev, selectedStudentIds: newSelected };
    });
  };

  const handleSelectAllToggle = () => {
    setSelectAll(prev => !prev);
    const allIds = promotionWizard.students.map(s => s._id || s.id);
    setPromotionWizard(prev => ({
      ...prev,
      selectedStudentIds: selectAll ? [] : allIds
    }));
  };

  const handlePromote = async () => {
    const isNaikSemester = (promoteModal.semester || '').toLowerCase() === 'ganjil';

    if (isNaikSemester) {
      if (!window.confirm(`Apakah Anda yakin ingin melakukan Kenaikan Semester dari Ganjil ke Genap untuk tahun ajaran ${promoteModal.yearName}?`)) return;
      setPromotionLoading(true);
      try {
        const response = await api.post(`/academic-years/${promoteModal.yearId}/promote-semester`);
        setSuccess(response.data.message || 'Kenaikan semester berhasil dilakukan.');
        setPromoteModal({ open: false, yearId: null, yearName: '', semester: '' });
        fetchAcademicYears();
      } catch (err) {
        setError(err.response?.data?.error || 'Gagal melakukan kenaikan semester');
      } finally {
        setPromotionLoading(false);
      }
    } else {
      if (!promotionWizard.sourceClassId || !promotionWizard.targetClassId) {
        setError('Pilih kelas asal dan kelas tujuan terlebih dahulu!');
        return;
      }

      if (promotionWizard.selectedStudentIds.length === 0) {
        setError('Pilih minimal 1 siswa untuk dinaikkan!');
        return;
      }

      const isLulus = promotionWizard.targetClassId === 'LULUS';
      const confirmMsg = isLulus 
        ? `PERINGATAN: Anda akan meluluskan ${promotionWizard.selectedStudentIds.length} siswa dari ${promotionWizard.sourceClassName} menjadi ALUMNI. Tindakan ini tidak bisa dibatalkan. Lanjutkan?`
        : `PERINGATAN: ${promotionWizard.selectedStudentIds.length} siswa dari ${promotionWizard.sourceClassName} akan dipindahkan ke ${promotionWizard.targetClassName}. Tindakan ini tidak bisa dibatalkan. Lanjutkan?`;
      
      if (!window.confirm(confirmMsg)) return;

      setPromotionLoading(true);
      try {
        const payload = {
          source_class_id: promotionWizard.sourceClassId,
          target_class_id: promotionWizard.targetClassId === 'LULUS' ? null : promotionWizard.targetClassId,
          student_ids: promotionWizard.selectedStudentIds,
          is_graduated: isLulus
        };

        const response = await api.post(`/academic-years/${promoteModal.yearId}/promote-wizard`, payload);
        setSuccess(response.data.message || 'Kenaikan kelas berhasil dilakukan!');
        setPromoteModal({ open: false, yearId: null, yearName: '', semester: '' });
        fetchAcademicYears();
        fetchClasses();
      } catch (err) {
        setError(err.response?.data?.error || 'Gagal melakukan kenaikan kelas');
      } finally {
        setPromotionLoading(false);
      }
    }
  };

  // ========== ALUMNI ==========
  const openAlumniModal = async (year) => {
    setAlumniModal({ open: true, yearId: year._id, yearName: year.year });
    setAlumniList([]);
    setAlumniLoading(true);
    setPagination({ ...pagination, currentPage: 1 });
    try {
      const response = await api.get(`/academic-years/${year._id}/alumni`);
      setAlumniList(response.data.alumni || []);
      setPagination(prev => ({ ...prev, totalItems: response.data.alumni?.length || 0 }));
    } catch (err) {
      setError('Gagal memuat data alumni');
    } finally {
      setAlumniLoading(false);
    }
  };

  const fetchAlumniDetail = async (studentId, yearId) => {
    setDetailAlumniModal({ open: true, student: null, grades: [], loading: true });
    try {
      const response = await api.get(`/academic-years/${yearId}/alumni/${studentId}`);
      const { student, grades } = response.data;
      setDetailAlumniModal({ open: true, student: student, grades: grades || [], loading: false });
    } catch (err) {
      console.error('Error fetching alumni detail:', err);
      setError(err.response?.data?.error || 'Gagal memuat detail alumni.');
      setDetailAlumniModal({ open: false, student: null, grades: [], loading: false });
    }
  };

  // ========== PAGINATION HELPERS ==========
  const getPaginatedData = (data) => {
    const { currentPage, itemsPerPage } = pagination;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getTotalPages = (totalItems) => {
    return Math.ceil(totalItems / pagination.itemsPerPage);
  };

  if (loading && academicYears.length === 0) {
    return <div className="academic-loading">Memuat data...</div>;
  }

  return (
    <div className="academic-container">
      <div className="academic-header">
        <div>
          <h2>Tahun Ajaran</h2>
          <p>Kelola tahun ajaran, kenaikan kelas, dan alumni</p>
        </div>
        <button className="btn-add" onClick={() => { setEditingYear(null); setFormData({ year: '', start_date: '', end_date: '', grade_input_start_date: '', grade_input_end_date: '', is_active: true, semester: '' }); setShowModal(true); }}>
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
                    <button className="btn-edit" onClick={() => handleEdit(year)}>Edit</button>
                    <button className="btn-promote" onClick={() => openPromoteModal(year)}>
                      {(year.semester || '').toLowerCase() === 'ganjil' ? 'Kenaikan Semester' : 'Kenaikan Kelas'}
                    </button>
                    <button className="btn-alumni" onClick={() => openAlumniModal(year)}>Alumni</button>
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
              <div className="form-row">
                <div className="form-group">
                  <label>Mulai Input Nilai</label>
                  <input type="date" name="grade_input_start_date" value={formData.grade_input_start_date} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Batas Akhir Input Nilai</label>
                  <input type="date" name="grade_input_end_date" value={formData.grade_input_end_date} onChange={handleChange} />
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

      {/* ============================================================
          MODAL KENAIKAN KELAS - WIZARD VERSION (DIPERBAIKI)
          ============================================================ */}
      {promoteModal.open && (() => {
        const isNaikSemester = (promoteModal.semester || '').toLowerCase() === 'ganjil';
        const wizard = promotionWizard;

        if (isNaikSemester) {
          return (
            <div className="modal-overlay" onClick={() => setPromoteModal({ open: false })}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  📅 Kenaikan Semester - {promoteModal.yearName}
                </h3>
                <div className="alert-warning" style={{ padding: '16px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '10px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '700' }}>Informasi Kenaikan Semester:</p>
                  <ul style={{ margin: '4px 0 0 20px', paddingLeft: '4px' }}>
                    <li>Menonaktifkan semester <strong>Ganjil</strong> dan mengaktifkan semester <strong>Genap</strong>.</li>
                    <li>Siswa <strong>tidak mengalami kenaikan kelas</strong> dan tetap di kelas saat ini.</li>
                  </ul>
                </div>
                {promotionLoading && <div className="loading-spinner" style={{ textAlign: 'center', marginBottom: '20px' }}>Sedang memproses...</div>}
                <div className="modal-buttons" style={{ borderTop: 'none', paddingTop: '0' }}>
                  <button onClick={() => setPromoteModal({ open: false })} style={{ background: '#64748b', color: '#fff' }}>Batal</button>
                  <button onClick={handlePromote} disabled={promotionLoading} style={{ backgroundColor: '#0284c7', color: '#fff' }}>
                    {promotionLoading ? 'Memproses...' : 'Proses Naik Semester'}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="modal-overlay" onClick={() => setPromoteModal({ open: false })}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', padding: '24px 28px' }}>
              
              {/* HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    📈 Kenaikan Kelas - {promoteModal.yearName}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Pindahkan siswa ke tingkat kelas berikutnya atau luluskan menjadi alumni
                  </p>
                </div>
                <button onClick={() => setPromoteModal({ open: false })} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '20px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              {/* STEP INDICATOR - Lebih Baik */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '28px',
                padding: '14px 20px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                {[
                  { step: 1, label: '📋 Kelas Asal', desc: 'Pilih kelas sumber' },
                  { step: 2, label: '🎯 Kelas Tujuan', desc: 'Pilih kelas target' },
                  { step: 3, label: '✅ Konfirmasi', desc: 'Review & proses' }
                ].map((item, index) => {
                  const isActive = wizard.step === item.step;
                  const isCompleted = wizard.step > item.step;
                  return (
                    <div key={item.step} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '10px',
                      flex: 1
                    }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isCompleted ? '#16a34a' : isActive ? '#0284c7' : '#e2e8f0',
                        color: isCompleted || isActive ? '#fff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '800',
                        flexShrink: 0,
                        boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none'
                      }}>
                        {isCompleted ? '✓' : item.step}
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: isActive ? '800' : '600',
                          color: isActive ? '#0284c7' : isCompleted ? '#16a34a' : '#64748b'
                        }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.desc}</div>
                      </div>
                      {index < 2 && (
                        <div style={{ 
                          flex: 1, 
                          height: '2px', 
                          background: wizard.step > index + 1 ? '#16a34a' : '#e2e8f0',
                          margin: '0 8px'
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: PILIH KELAS ASAL */}
              {wizard.step === 1 && (
                <div>
                  <div style={{ 
                    padding: '14px 18px', 
                    background: '#eff6ff', 
                    border: '1px solid #bfdbfe', 
                    borderRadius: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '20px' }}>💡</span>
                    <span style={{ fontSize: '14px', color: '#1e40af' }}>
                      Pilih kelas yang akan dinaikkan ke tingkat berikutnya atau diluluskan.
                    </span>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontWeight: '700', fontSize: '14px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Pilih Kelas Asal:
                    </label>
                    <select
                      value={wizard.sourceClassId}
                      onChange={(e) => handleSourceClassSelect(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '2px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#0284c7'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <option value="">-- Pilih Kelas Asal --</option>
                      {allClasses
                        .filter(c => c.grade_level && Number(c.grade_level) < 9)
                        .sort((a, b) => Number(a.grade_level) - Number(b.grade_level))
                        .map(c => (
                          <option key={c._id} value={c._id}>
                            📚 Kelas {c.name} (Tingkat {c.grade_level})
                          </option>
                        ))}
                    </select>
                  </div>

                  {wizard.sourceClassId && wizard.students.length > 0 && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '14px 18px', 
                      background: '#f0fdf4', 
                      borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '24px' }}>✅</span>
                      <div>
                        <span style={{ fontSize: '14px', color: '#166534', fontWeight: '600' }}>
                          <strong>{wizard.students.length}</strong> siswa akan dipindahkan dari <strong>{wizard.sourceClassName}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
                    <button
                      onClick={handleWizardNext}
                      disabled={!wizard.sourceClassId}
                      style={{
                        padding: '12px 36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: wizard.sourceClassId ? '#0284c7' : '#94a3b8',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: wizard.sourceClassId ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s'
                      }}
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PILIH KELAS TUJUAN + DAFTAR SISWA */}
              {wizard.step === 2 && (
                <div>
                  {/* Info Bar */}
                  <div style={{ 
                    padding: '12px 18px', 
                    background: '#f1f5f9', 
                    borderRadius: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#334155' }}>
                      📋 Kelas Asal: <strong>{wizard.sourceClassName}</strong>
                    </span>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      👥 {wizard.students.length} siswa
                    </span>
                  </div>

                  {/* Pilih Kelas Tujuan */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: '700', fontSize: '14px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Pilih Kelas Tujuan:
                    </label>
                    <select
                      value={wizard.targetClassId}
                      onChange={(e) => handleTargetClassSelect(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '2px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#0284c7'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <option value="">-- Pilih Kelas Tujuan --</option>
                      {allClasses
                        .filter(c => {
                          const sourceGrade = allClasses.find(c2 => c2._id === wizard.sourceClassId)?.grade_level || 0;
                          return Number(c.grade_level) === Number(sourceGrade) + 1;
                        })
                        .map(c => (
                          <option key={c._id} value={c._id}>
                            📚 Kelas {c.name} (Tingkat {c.grade_level})
                          </option>
                        ))}
                      <option value="LULUS" style={{ color: '#dc2626', fontWeight: '700' }}>
                        🎓 LULUS (Alumni)
                      </option>
                    </select>
                  </div>

                  {/* DAFTAR SISWA - Dengan Checklist */}
                  {wizard.targetClassId && wizard.students.length > 0 && (
                    <div style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      marginTop: '16px'
                    }}>
                      <div style={{ 
                        padding: '12px 18px', 
                        background: '#f8fafc', 
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                            📋 Daftar Siswa
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            ({wizard.students.length} siswa)
                          </span>
                        </div>
                        <label style={{ fontSize: '13px', color: '#0284c7', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={wizard.selectedStudentIds.length === wizard.students.length && wizard.students.length > 0}
                            onChange={handleSelectAllToggle}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          Pilih Semua
                        </label>
                      </div>

                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                              <th style={{ padding: '10px 14px', width: '40px' }}>Pilih</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left' }}>NIS</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Nama Siswa</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wizard.students.map((student, idx) => {
                              const studentId = student._id || student.id;
                              const isSelected = wizard.selectedStudentIds.includes(studentId);
                              const isLulus = wizard.targetClassId === 'LULUS';
                              return (
                                <tr key={studentId} style={{ 
                                  borderBottom: '1px solid #f1f5f9',
                                  background: isSelected ? '#f0fdf4' : '#ffffff'
                                }}>
                                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: '700' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleStudent(studentId)}
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#475569' }}>
                                    {student.nis || '-'}
                                  </td>
                                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>
                                    {student.full_name || student.name}
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span style={{ 
                                      padding: '3px 12px', 
                                      borderRadius: '12px', 
                                      background: isLulus ? '#fef3c7' : '#dcfce7',
                                      color: isLulus ? '#92400e' : '#15803d',
                                      fontSize: '12px',
                                      fontWeight: '700'
                                    }}>
                                      {isLulus ? '🎓 Akan Lulus' : '↗ Akan Naik'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ 
                        padding: '10px 18px', 
                        background: '#f8fafc', 
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {wizard.selectedStudentIds.length} dari {wizard.students.length} siswa dipilih
                        </span>
                        {wizard.targetClassId === 'LULUS' ? (
                          <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '700' }}>
                            🎓 Akan diluluskan menjadi Alumni
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#0284c7', fontWeight: '700' }}>
                            📋 Akan dipindahkan ke {wizard.targetClassName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button
                      onClick={handleWizardBack}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={handleWizardNext}
                      disabled={!wizard.targetClassId || wizard.selectedStudentIds.length === 0}
                      style={{
                        padding: '12px 36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: wizard.targetClassId && wizard.selectedStudentIds.length > 0 ? '#0284c7' : '#94a3b8',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: wizard.targetClassId && wizard.selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: KONFIRMASI */}
              {wizard.step === 3 && (
                <div>
                  <div style={{ 
                    background: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '12px', 
                    padding: '20px 24px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 14px 0', color: '#16a34a', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '22px' }}>✅</span> Konfirmasi Kenaikan Kelas
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Tahun Ajaran</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{promoteModal.yearName}</span>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Kelas Asal</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{wizard.sourceClassName}</span>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Kelas Tujuan</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: wizard.targetClassId === 'LULUS' ? '#dc2626' : '#0284c7' }}>
                          {wizard.targetClassId === 'LULUS' ? '🎓 LULUS (Alumni)' : wizard.targetClassName}
                        </span>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Jumlah Siswa</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0284c7' }}>
                          {wizard.selectedStudentIds.length} siswa
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daftar Siswa yang Akan Dipromosikan */}
                  {wizard.selectedStudentIds.length > 0 && (
                    <div style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '10px', 
                      overflow: 'hidden',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        padding: '10px 16px', 
                        background: '#f8fafc', 
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0f172a'
                      }}>
                        📋 Siswa yang akan dipromosikan ({wizard.selectedStudentIds.length})
                      </div>
                      <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px 12px' }}>
                        {wizard.students
                          .filter(s => wizard.selectedStudentIds.includes(s._id || s.id))
                          .map((s, idx) => (
                            <span key={s._id || s.id} style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              margin: '4px 6px 4px 0',
                              background: '#f1f5f9',
                              borderRadius: '6px',
                              fontSize: '13px',
                              color: '#334155'
                            }}>
                              {idx + 1}. {s.full_name || s.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div style={{ 
                    padding: '14px 18px', 
                    background: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: '600' }}>
                      Tindakan ini tidak dapat dibatalkan. Pastikan data sudah benar.
                    </span>
                  </div>

                  {promotionLoading && (
                    <div style={{ textAlign: 'center', marginBottom: '16px', color: '#0284c7', fontWeight: '700' }}>
                      ⏳ Sedang memproses kenaikan kelas...
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <button
                      onClick={handleWizardBack}
                      disabled={promotionLoading}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: promotionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={handlePromote}
                      disabled={promotionLoading}
                      style={{
                        padding: '12px 36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: promotionLoading ? '#94a3b8' : '#dc2626',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: promotionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: promotionLoading ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)'
                      }}
                    >
                      {promotionLoading ? '⏳ Memproses...' : '✅ Proses Naik Kelas'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* ============================================================
          MODAL ALUMNI - DENGAN PAGINATION
          ============================================================ */}
      {alumniModal.open && (() => {
        const groupedAlumni = {};
        alumniList.forEach(a => {
          const className = a.graduated_from_class || 'Lainnya';
          if (!groupedAlumni[className]) {
            groupedAlumni[className] = [];
          }
          groupedAlumni[className].push(a);
        });
        const classKeys = Object.keys(groupedAlumni).sort();

        return (
          <div className="modal-overlay" onClick={() => setAlumniModal({ open: false })}>
            <div className="modal-content alumni-modal" onClick={e => e.stopPropagation()} style={{ width: '950px', maxWidth: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                Alumni - {alumniModal.yearName}
              </h3>
              {alumniLoading ? <div className="loading-spinner">Memuat data alumni...</div> : (
                <div className="alumni-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  {alumniList.length === 0 ? (
                    <p className="empty-message">Belum ada alumni tahun ini</p>
                  ) : (
                    <div>
                      {classKeys.map(clsName => {
                        const studentsInClass = groupedAlumni[clsName];
                        const totalItems = studentsInClass.length;
                        const totalPages = getTotalPages(totalItems);
                        const paginatedStudents = getPaginatedData(studentsInClass);

                        return (
                          <div key={clsName} style={{ marginBottom: '32px' }}>
                            <h4 style={{ 
                              fontSize: '15px', 
                              fontWeight: '800', 
                              color: '#1e293b', 
                              padding: '8px 16px', 
                              background: '#eff6ff', 
                              borderRadius: '10px', 
                              display: 'inline-block',
                              marginBottom: '14px' 
                            }}>
                              Kelas {clsName} ({studentsInClass.length} Lulusan)
                            </h4>
                            
                            <table className="alumni-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '50px', padding: '10px', background: '#f8fafc', fontWeight: '700', textAlign: 'left' }}>No</th>
                                  <th style={{ padding: '10px', background: '#f8fafc', fontWeight: '700', textAlign: 'left' }}>Nama Lengkap</th>
                                  <th style={{ padding: '10px', background: '#f8fafc', fontWeight: '700', textAlign: 'left' }}>NIS</th>
                                  <th style={{ width: '140px', padding: '10px', background: '#f8fafc', fontWeight: '700', textAlign: 'center' }}>Rata-Rata</th>
                                  <th style={{ width: '100px', padding: '10px', background: '#f8fafc', fontWeight: '700', textAlign: 'center' }}>Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedStudents.map((a, idx) => {
                                  const globalIdx = (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1;
                                  return (
                                    <tr key={a._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '10px' }}>{globalIdx}</td>
                                      <td style={{ padding: '10px', fontWeight: '600', color: '#0f172a' }}>{a.full_name}</td>
                                      <td style={{ padding: '10px', color: '#64748b' }}>{a.nis}</td>
                                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: '800', color: a.average_score !== '-' ? '#2563eb' : '#94a3b8' }}>
                                        {a.average_score}
                                      </td>
                                      <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => fetchAlumniDetail(a._id, alumniModal.yearId)}
                                          style={{
                                            background: '#0284c7',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Detail
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {totalPages > 1 && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '14px',
                                paddingTop: '12px',
                                borderTop: '1px solid #e2e8f0'
                              }}>
                                <button
                                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                                  disabled={pagination.currentPage === 1}
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: pagination.currentPage === 1 ? '#f1f5f9' : '#ffffff',
                                    color: pagination.currentPage === 1 ? '#94a3b8' : '#334155',
                                    cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                  }}
                                >
                                  ◀ Sebelumnya
                                </button>
                                
                                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                                  const pageNum = i + 1;
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => handlePageChange(pageNum)}
                                      style={{
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        border: pagination.currentPage === pageNum ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                        background: pagination.currentPage === pageNum ? '#eff6ff' : '#ffffff',
                                        color: pagination.currentPage === pageNum ? '#0284c7' : '#475569',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: pagination.currentPage === pageNum ? '800' : '600'
                                      }}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}

                                {totalPages > 10 && (
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>...</span>
                                )}

                                <button
                                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                                  disabled={pagination.currentPage === totalPages}
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: pagination.currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                                    color: pagination.currentPage === totalPages ? '#94a3b8' : '#334155',
                                    cursor: pagination.currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                  }}
                                >
                                  Selanjutnya ▶
                                </button>

                                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                                  {pagination.currentPage} / {totalPages} halaman
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="modal-buttons" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '12px' }}>
                <button onClick={() => setAlumniModal({ open: false })} style={{ background: '#64748b', color: '#fff', borderRadius: '10px', padding: '10px 24px', fontWeight: '700' }}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================
          MODAL DETAIL ALUMNI
          ============================================================ */}
      {detailAlumniModal.open && (
        <div className="modal-overlay" onClick={() => setDetailAlumniModal({ ...detailAlumniModal, open: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '700px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              Detail Alumni
            </h3>
            
            {detailAlumniModal.loading ? (
              <div className="loading-spinner">Memuat data...</div>
            ) : (
              <>
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Nama Lengkap</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '2px 0' }}>
                        {detailAlumniModal.student?.full_name || '-'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>NIS</span>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '2px 0' }}>
                        {detailAlumniModal.student?.nis || '-'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>NISN</span>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '2px 0' }}>
                        {detailAlumniModal.student?.nisn || '-'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Kelas Lulus</span>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '2px 0' }}>
                        {detailAlumniModal.student?.graduated_from_class || '-'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Tahun Lulus</span>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '2px 0' }}>
                        {detailAlumniModal.student?.graduated_year || '-'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Rata-rata Nilai</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', margin: '2px 0' }}>
                        {detailAlumniModal.student?.average_score || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                    Riwayat Nilai
                  </h4>
                  {detailAlumniModal.grades.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data nilai</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Mata Pelajaran</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Nilai</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Grade</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailAlumniModal.grades.map((g, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: '600' }}>{g.subject_name || g.subject?.name || '-'}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>
                                {g.final_score || g.score || g.nilai_akhir || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {g.grade || g.letter || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: (g.final_score >= 75 || g.score >= 75 || g.nilai_akhir >= 75) ? '#dcfce7' : '#fee2e2',
                                  color: (g.final_score >= 75 || g.score >= 75 || g.nilai_akhir >= 75) ? '#16a34a' : '#dc2626'
                                }}>
                                  {(g.final_score >= 75 || g.score >= 75 || g.nilai_akhir >= 75) ? 'Tuntas' : 'Belum Tuntas'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="modal-buttons" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '20px' }}>
              <button 
                onClick={() => setDetailAlumniModal({ ...detailAlumniModal, open: false })}
                style={{ background: '#64748b', color: '#fff', borderRadius: '10px', padding: '10px 24px', fontWeight: '700' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademicYear;