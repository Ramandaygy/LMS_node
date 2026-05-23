import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    nis: '',
    class: '',
    is_active: true
  });

  // ========== STATE UNTUK PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // ========== STATE UNTUK NOTIFIKASI ==========
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ========== STATE UNTUK DETAIL SISWA ==========
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ========== STATE UNTUK DROPDOWN & IMPORT ==========
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Stats data
  const [stats, setStats] = useState({
    total_students: 0
  });

  // Daftar kelas yang tersedia
  const [availableClasses, setAvailableClasses] = useState([
    { value: '', label: 'Semua Kelas' }
  ]);

  // Fetch daftar kelas dari database
  const fetchClasses = async () => {
    try {
      const response = await api.get('/admin/classes');
      const classes = response.data.classes || [];
      const classOptions = [
        { value: '', label: 'Semua Kelas' },
        ...classes.map(c => ({ value: c.name, label: `${c.name}` }))
      ];
      setAvailableClasses(classOptions);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setAvailableClasses([
        { value: '', label: 'Semua Kelas' },
        { value: '7A', label: '7A' },
        { value: '7B', label: '7B' },
        { value: '7C', label: '7C' },
        { value: '8A', label: '8A' },
        { value: '8B', label: '8B' },
        { value: '8C', label: '8C' },
        { value: '9A', label: '9A' },
        { value: '9B', label: '9B' },
        { value: '9C', label: '9C' }
      ]);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchStats();
    fetchClasses();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset ke halaman 1 ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, selectedStatus]);

  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats({
        total_students: response.data.total_students || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/admin/users/students');
      console.log('Students response:', response.data);
      
      const studentsData = (response.data.students || []).map(student => ({
        _id: student.id || student._id,
        id: student.id || student._id,
        email: student.email,
        username: student.username,
        full_name: student.full_name,
        nis: student.nis,
        class: student.class || '-',
        is_active: student.is_active !== undefined ? student.is_active : true,
        role: student.role,
        created_at: student.created_at
      }));
      
      console.log('Mapped students:', studentsData);
      setStudents(studentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setErrorMsg('Gagal memuat data siswa');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      if (editingStudent) {
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
          nis: formData.nis,
          class: formData.class,
          is_active: formData.is_active
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/admin/users/students/${editingStudent.id}`, updateData);
        setSuccessMsg('Data siswa berhasil diupdate');
      } else {
        const userData = { 
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          nis: formData.nis,
          class: formData.class,
          role: 'siswa',
          is_active: formData.is_active
        };
        await api.post('/auth/register', userData);
        setSuccessMsg('Siswa berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ 
        full_name: '', 
        email: '', 
        username: '', 
        password: '', 
        nis: '', 
        class: '',
        is_active: true 
      });
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('Error saving student:', error);
      setErrorMsg(error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data siswa');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name || '',
      email: student.email || '',
      username: student.username || '',
      password: '',
      nis: student.nis || '',
      class: student.class || '',
      is_active: student.is_active !== undefined ? student.is_active : true
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
      try {
        await api.delete(`/admin/users/students/${id}`);
        setSuccessMsg('Siswa berhasil dihapus');
        fetchStudents();
        fetchStats();
      } catch (error) {
        console.error('Error deleting student:', error);
        setErrorMsg('Gagal menghapus siswa');
      }
    }
  };

  const handleToggleStatus = async (student) => {
    const newStatus = !student.is_active;
    try {
      await api.put(`/admin/users/students/${student.id}`, {
        is_active: newStatus
      });
      setSuccessMsg(`Status siswa berhasil diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`);
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('Error toggling status:', error);
      setErrorMsg('Gagal mengubah status siswa');
    }
  };

  const handleResetPassword = async (student) => {
    if (window.confirm(`Reset password untuk ${student.full_name}? Password akan direset menjadi "siswa123"`)) {
      try {
        await api.post(`/admin/users/students/${student.id}/reset-password`, {
          new_password: 'siswa123'
        });
        setSuccessMsg(`Password ${student.full_name} berhasil direset menjadi "siswa123"`);
      } catch (error) {
        console.error('Error resetting password:', error);
        setErrorMsg('Gagal mereset password');
      }
    }
  };

  // ========== FUNGSI DETAIL SISWA ==========
  const handleShowDetail = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  // ============================================================
  // FUNGSI EXPORT
  // ============================================================
  const handleExport = async (type, filename) => {
    setExportLoading(true);
    setDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    
    let endpoint = '';
    switch(type) {
      case 'students':
        endpoint = '/admin/export/students';
        break;
      default:
        setErrorMsg('Tipe export tidak dikenal');
        setExportLoading(false);
        return;
    }
    
    try {
      const response = await api.get(endpoint, {
        responseType: 'blob'
      });
      
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
      console.error('Export error:', error);
      setErrorMsg('Gagal mengexport data');
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================================
  // FUNGSI DOWNLOAD TEMPLATE EXCEL (TANPA DATA)
  // ============================================================
  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    setDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      // Panggil endpoint template yang menghasilkan file Excel hanya header
      const response = await api.get('/admin/export/students-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_siswa.xlsx');
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

  // ============================================================
  // FUNGSI IMPORT
  // ============================================================
  const handleImportClick = () => {
    setDropdownOpen(false);
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
      setErrorMsg('Format file harus .xlsx atau .xls');
      return;
    }

    setImportLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/admin/import/students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { success_count, error_count, errors, default_password } = response.data;
      
      if (error_count > 0) {
        setErrorMsg(`Import selesai: ${success_count} berhasil, ${error_count} gagal.`);
        console.error('Import errors:', errors);
      } else {
        setSuccessMsg(`Import berhasil! ${success_count} data siswa ditambahkan. Password default: ${default_password || 'siswa123'}`);
      }
      
      fetchStudents();
      fetchStats();
      
    } catch (error) {
      console.error('Import error:', error);
      setErrorMsg(error.response?.data?.error || 'Gagal mengimport data. Cek format file Anda.');
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.nis?.includes(searchTerm) ||
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || student.class === selectedClass;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && student.is_active === true) ||
      (selectedStatus === 'inactive' && student.is_active === false);
    
    return matchesSearch && matchesClass && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-students-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-badge">Administrative Dashboard</span>
          <h2 className="admin-page-title">Kelola Siswa</h2>
        </div>
        <div className="header-buttons">
          <div className="dropdown" ref={dropdownRef}>
            <button 
              className="dropdown-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="material-symbols-outlined">file_present</span>
              Data
              <span className="material-symbols-outlined dropdown-arrow">expand_more</span>
            </button>
            
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-group">
                  <div className="dropdown-group-title">EXPORT</div>
                  <button onClick={() => handleExport('students', 'siswa.xlsx')}>
                    <span className="material-symbols-outlined">school</span> Export Siswa
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group">
                  <div className="dropdown-group-title">IMPORT</div>
                  <button onClick={handleImportClick} disabled={importLoading}>
                    <span className="material-symbols-outlined">upload_file</span>
                    {importLoading ? 'Mengimport...' : 'Import Siswa (Excel)'}
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group">
                  <div className="dropdown-group-title">TEMPLATE</div>
                  <button onClick={handleDownloadTemplate} disabled={templateLoading}>
                    <span className="material-symbols-outlined">description</span>
                    {templateLoading ? 'Memproses...' : 'Download Template Excel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="admin-add-user-btn" onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined">add</span>
            Tambah Siswa Baru
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="notification error">
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
          <button className="notification-close" onClick={() => setErrorMsg('')}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="notification success">
          <span className="material-symbols-outlined">check_circle</span>
          {successMsg}
          <button className="notification-close" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}

      {/* Stats Card */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card students">
          <div className="admin-stat-header">
            <div className="admin-stat-icon">
              <span className="material-symbols-outlined">school</span>
            </div>
          </div>
          <div className="admin-stat-info">
            <p className="admin-stat-label">Total Siswa</p>
            <p className="admin-stat-value">{stats.total_students}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="admin-table-container">
        {/* Filter Bar */}
        <div className="admin-table-filters">
          <div className="admin-filter-group">
            <div className="admin-filter-select">
              <span className="material-symbols-outlined">class</span>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {availableClasses.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="admin-filter-select">
              <span className="material-symbols-outlined">check_circle</span>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
          
          <div className="admin-search-wrapper">
            <span className="material-symbols-outlined">search</span>
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama, NIS, atau email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-table-empty">
                    Tidak ada data siswa
                  </td>
                </tr>
              ) : (
                currentItems.map((student) => (
                  <tr key={student.id}>
                    <td className="admin-user-info-cell">
                      {/* Area yang bisa diklik untuk detail */}
                      <div 
                        className="admin-user-info"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleShowDetail(student)}
                      >
                        <div className="admin-user-avatar">
                          <span className="material-symbols-outlined">account_circle</span>
                        </div>
                        <div>
                          <p className="admin-user-name">{student.full_name || '-'}</p>
                          <p className="admin-user-email">{student.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="admin-user-id">{student.nis || '-'}</td>
                    <td className="admin-class-cell">
                      <span className="admin-class-badge">
                        {student.class && student.class !== '-' ? student.class : '-'}
                      </span>
                    </td>
                    <td className="admin-status-cell">
                      <span className={`admin-status-badge ${student.is_active ? 'active' : 'inactive'}`}>
                        {student.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button 
                        className="admin-action-btn edit" 
                        onClick={() => handleEdit(student)} 
                        title="Edit"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button 
                        className="admin-action-btn reset" 
                        onClick={() => handleResetPassword(student)} 
                        title="Reset Password (siswa123)"
                      >
                        <span className="material-symbols-outlined">lock_reset</span>
                      </button>
                      <button 
                        className="admin-action-btn delete" 
                        onClick={() => handleDelete(student.id)} 
                        title="Delete"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="admin-table-pagination">
            <p className="admin-pagination-info">
              Menampilkan <span className="font-bold">{filteredStudents.length === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="font-bold">{Math.min(indexOfLastItem, filteredStudents.length)}</span> dari <span className="font-bold">{filteredStudents.length}</span> Siswa
            </p>
            <div className="admin-pagination-controls">
              <button 
                className="admin-page-btn"
                onClick={goToPrevPage}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (totalPages <= 5 || 
                    pageNumber === 1 || 
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                  return (
                    <button 
                      key={pageNumber}
                      className={`admin-page-btn ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => goToPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={pageNumber} className="pagination-dots">...</span>;
                }
                return null;
              })}
              
              <button 
                className="admin-page-btn"
                onClick={goToNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form Tambah/Edit Siswa */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-students-modal modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Nama Lengkap *</label>
                  <input
                    type="text"
                    name="full_name"
                    className="admin-students-form-input"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="admin-students-form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Username *</label>
                  <input
                    type="text"
                    name="username"
                    className="admin-students-form-input"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Password {!editingStudent && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    className="admin-students-form-input"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editingStudent}
                    placeholder={editingStudent ? 'Kosongkan jika tidak diubah' : ''}
                  />
                </div>
              </div>

              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">NIS *</label>
                  <input
                    type="text"
                    name="nis"
                    className="admin-students-form-input"
                    value={formData.nis}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Kelas</label>
                  <select
                    name="class"
                    className="admin-students-form-select"
                    value={formData.class}
                    onChange={handleChange}
                  >
                    <option value="">Pilih Kelas</option>
                    {availableClasses.filter(c => c.value !== '').map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Field */}
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Status</label>
                  <select
                    name="is_active"
                    className="admin-students-form-select"
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  >
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

      {/* Modal Detail Siswa */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="admin-students-modal modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Detail Siswa</h3>
            <div className="detail-field">
              <strong>Nama Lengkap:</strong> {selectedStudent.full_name}
            </div>
            <div className="detail-field">
              <strong>NIS:</strong> {selectedStudent.nis}
            </div>
            <div className="detail-field">
              <strong>Email:</strong> {selectedStudent.email}
            </div>
            <div className="detail-field">
              <strong>Username:</strong> {selectedStudent.username}
            </div>
            <div className="detail-field">
              <strong>Kelas:</strong> {selectedStudent.class || '-'}
            </div>
            <div className="detail-field">
              <strong>Status:</strong> {selectedStudent.is_active ? 'Aktif' : 'Nonaktif'}
            </div>
            <div className="detail-field">
              <strong>ID Siswa:</strong> {selectedStudent.id}
            </div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowDetailModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;