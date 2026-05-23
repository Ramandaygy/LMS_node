import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    nip: '',
    teacher_code: '',
    subjects: [],      // ID mapel (untuk dikirim ke backend)
    classes: [],       // ID kelas
    phone: '',
    is_active: true,
  });

  const [allSubjects, setAllSubjects] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false); // state untuk loading template
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [stats, setStats] = useState({ total_teachers: 0 });

  useEffect(() => {
    fetchTeachers();
    fetchStats();
    fetchMasterData();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => setCurrentPage(1), [searchTerm, selectedStatus]);
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  const fetchMasterData = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        api.get('/admin/subjects/options'),
        api.get('/admin/classes/options'),
      ]);
      setAllSubjects(subjectsRes.data.subjects || []);
      setAllClasses(classesRes.data.classes || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats({ total_teachers: response.data.total_teachers || 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/admin/users/teachers?limit=200');
      const teachersRaw = response.data.teachers || [];

      const teachersData = teachersRaw.map((teacher) => ({
        ...teacher,
        id: teacher._id,
        full_name: teacher.full_name,
        email: teacher.email,
        username: teacher.username,
        nip: teacher.nip,
        teacher_code: teacher.teacher_code || teacher.username || '',
        subjects: teacher.subjects || [],
        classes: teacher.classes || [],
        subject_ids: teacher.subject_ids || [],
        class_ids: teacher.class_ids || [],
        phone: teacher.phone || '',
        is_active: teacher.is_active !== undefined ? teacher.is_active : true,
      }));
      setTeachers(teachersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setErrorMsg('Gagal memuat data guru');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleMultiSelect = (e, field) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setFormData({ ...formData, [field]: selected });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        nip: formData.nip,
        teacher_code: formData.teacher_code,
        subjects: formData.subjects,
        classes: formData.classes,
        phone: formData.phone,
        is_active: formData.is_active,
        role: 'guru',
        username: formData.teacher_code,
      };
      if (formData.password) payload.password = formData.password;

      if (editingTeacher) {
        await api.put(`/admin/users/teachers/${editingTeacher.id}`, payload);
        setSuccessMsg('Data guru berhasil diupdate');
      } else {
        await api.post('/auth/register', payload);
        setSuccessMsg('Guru berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingTeacher(null);
      setFormData({
        full_name: '', email: '', password: '', nip: '', teacher_code: '', subjects: [], classes: [], phone: '', is_active: true,
      });
      fetchTeachers();
      fetchStats();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal menyimpan data guru');
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      full_name: teacher.full_name || '',
      email: teacher.email || '',
      password: '',
      nip: teacher.nip || '',
      teacher_code: teacher.teacher_code || '',
      subjects: teacher.subject_ids || [],
      classes: teacher.class_ids || [],
      phone: teacher.phone || '',
      is_active: teacher.is_active !== undefined ? teacher.is_active : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus guru ini?')) {
      try {
        await api.delete(`/admin/users/teachers/${id}`);
        setSuccessMsg('Guru berhasil dihapus');
        fetchTeachers();
        fetchStats();
      } catch (error) {
        setErrorMsg('Gagal menghapus guru');
      }
    }
  };

  const handleResetPassword = async (teacher) => {
    if (window.confirm(`Reset password untuk ${teacher.full_name}? Password akan direset menjadi "guru123"`)) {
      try {
        await api.post(`/admin/users/teachers/${teacher.id}/reset-password`, { new_password: 'guru123' });
        setSuccessMsg(`Password ${teacher.full_name} berhasil direset menjadi "guru123"`);
      } catch (error) {
        setErrorMsg('Gagal mereset password');
      }
    }
  };

  const handleExport = async (type, filename) => {
    setExportLoading(true);
    setDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    if (type !== 'teachers') {
      setErrorMsg('Tipe export tidak dikenal');
      setExportLoading(false);
      return;
    }
    try {
      const response = await api.get('/admin/export/teachers', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMsg(`Export ${filename} berhasil!`);
    } catch (error) {
      setErrorMsg('Gagal mengexport data');
    } finally {
      setExportLoading(false);
    }
  };

  // ========== FUNGSI DOWNLOAD TEMPLATE ==========
  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    setDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await api.get('/admin/export/teachers-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_guru.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Template Excel berhasil diunduh');
    } catch (error) {
      console.error('Template download error:', error);
      setErrorMsg('Gagal mengunduh template. Pastikan endpoint tersedia.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportClick = () => {
    setDropdownOpen(false);
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setErrorMsg('Format file harus .xlsx atau .xls');
      return;
    }
    setImportLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/admin/import/teachers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { success_count, error_count, errors } = response.data;
      if (error_count > 0) {
        setErrorMsg(`Import selesai: ${success_count} berhasil, ${error_count} gagal.`);
        console.error('Import errors:', errors);
      } else {
        setSuccessMsg(`Import berhasil! ${success_count} data guru ditambahkan.`);
      }
      fetchTeachers();
      fetchStats();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Gagal mengimport data. Cek format file Anda.');
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.nip?.includes(searchTerm) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus ||
      (selectedStatus === 'active' && teacher.is_active === true) ||
      (selectedStatus === 'inactive' && teacher.is_active === false);
    return matchesSearch && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const goToPage = (page) => setCurrentPage(page);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-students-container">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" style={{ display: 'none' }} />
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Kelola Guru</h2>
        </div>
        <div className="header-buttons">
          <div className="dropdown" ref={dropdownRef}>
            <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span className="material-symbols-outlined">file_present</span> Data
              <span className="material-symbols-outlined dropdown-arrow">expand_more</span>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-group"><div className="dropdown-group-title">EXPORT</div><button onClick={() => handleExport('teachers', 'guru.xlsx')}><span className="material-symbols-outlined">badge</span> Export Guru</button></div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group"><div className="dropdown-group-title">IMPORT</div><button onClick={handleImportClick} disabled={importLoading}><span className="material-symbols-outlined">upload_file</span>{importLoading ? 'Mengimport...' : 'Import Guru (Excel)'}</button></div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group"><div className="dropdown-group-title">TEMPLATE</div><button onClick={handleDownloadTemplate} disabled={templateLoading}><span className="material-symbols-outlined">description</span>{templateLoading ? 'Memproses...' : 'Download Template Excel'}</button></div>
                
              </div>
            )}
          </div>
          <button className="admin-add-user-btn" onClick={() => setShowModal(true)}><span className="material-symbols-outlined">add</span> Tambah Guru </button>
        </div>
      </div>

      {errorMsg && <div className="notification error">{errorMsg}<button className="notification-close" onClick={() => setErrorMsg('')}>×</button></div>}
      {successMsg && <div className="notification success">{successMsg}<button className="notification-close" onClick={() => setSuccessMsg('')}>×</button></div>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card students">
          <div className="admin-stat-header"><div className="admin-stat-icon"><span className="material-symbols-outlined">badge</span></div></div>
          <div className="admin-stat-info"><p className="admin-stat-label">Total Guru</p><p className="admin-stat-value">{stats.total_teachers}</p></div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-filters">
          <div className="admin-filter-group">
            <div className="admin-filter-select"><span className="material-symbols-outlined">check_circle</span><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
          </div>
          <div className="admin-search-wrapper"><span className="material-symbols-outlined">search</span><input type="text" placeholder="Cari berdasarkan nama, NIP, kode guru, atau email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>User Profile</th><th>Kode Guru</th><th>NIP</th><th>Mata Pelajaran</th><th>Kelas</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {currentItems.length === 0 ? <tr><td colSpan="7" className="admin-table-empty">Tidak ada data guru</td></tr> :
                currentItems.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="admin-user-info-cell"><div className="admin-user-info"><div className="admin-user-avatar"><span className="material-symbols-outlined">account_circle</span></div><div><p className="admin-user-name">{teacher.full_name || '-'}</p><p className="admin-user-email">{teacher.email || '-'}</p></div></div></td>
                    <td className="admin-user-id">{teacher.teacher_code || '-'}</td>
                    <td className="admin-user-id">{teacher.nip || '-'}</td>
                    <td className="admin-class-cell">{teacher.subjects?.join(', ') || '-'}</td>
                    <td className="admin-class-cell">{teacher.classes?.join(', ') || '-'}</td>
                    <td className="admin-status-cell"><span className={`admin-status-badge ${teacher.is_active ? 'active' : 'inactive'}`}>{teacher.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => handleEdit(teacher)} title="Edit"><span className="material-symbols-outlined">edit</span></button>
                      <button className="admin-action-btn reset" onClick={() => handleResetPassword(teacher)} title="Reset Password (guru123)"><span className="material-symbols-outlined">lock_reset</span></button>
                      <button className="admin-action-btn delete" onClick={() => handleDelete(teacher.id)} title="Delete"><span className="material-symbols-outlined">delete</span></button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className="admin-table-pagination">
            <p className="admin-pagination-info">Menampilkan {filteredTeachers.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTeachers.length)} dari {filteredTeachers.length} Guru</p>
            <div className="admin-pagination-controls">
              <button className="admin-page-btn" onClick={goToPrevPage} disabled={currentPage === 1}>‹</button>
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (totalPages <= 10 || page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                  return <button key={page} className={`admin-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>{page}</button>;
                } else if (page === currentPage - 3 || page === currentPage + 3) {
                  return <span key={page} className="pagination-dots">...</span>;
                }
                return null;
              })}
              <button className="admin-page-btn" onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0}>›</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-students-modal modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingTeacher ? 'Edit Guru' : 'Tambah Guru Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>Nama Lengkap *</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />
                </div>
                <div className="admin-students-form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>Kode Guru *</label>
                  <input type="text" name="teacher_code" value={formData.teacher_code} onChange={handleChange} placeholder="Contoh: G001 / 1001" required />
                </div>
                <div className="admin-students-form-group">
                  <label>Password {!editingTeacher && '*'}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingTeacher} placeholder={editingTeacher ? 'Kosongkan jika tidak diubah' : ''} />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>NIP *</label>
                  <input type="text" name="nip" value={formData.nip} onChange={handleChange} required />
                </div>
                <div className="admin-students-form-group">
                  <label>Mata Pelajaran</label>
                  <select multiple size="4" value={formData.subjects} onChange={(e) => handleMultiSelect(e, 'subjects')} className="admin-students-form-select">
                    {allSubjects.map(subj => <option key={subj._id} value={subj._id}>{subj.name}</option>)}
                  </select>
                  <small>Tekan Ctrl untuk memilih lebih dari satu</small>
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>Kelas</label>
                  <select multiple size="4" value={formData.classes} onChange={(e) => handleMultiSelect(e, 'classes')} className="admin-students-form-select">
                    {allClasses.map(cls => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
                  </select>
                  <small>Tekan Ctrl untuk memilih lebih dari satu</small>
                </div>
                <div className="admin-students-form-group">
                  <label>Nomor Telepon</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>Status</label>
                  <select name="is_active" value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-save">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;