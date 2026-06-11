import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';

const AdminStudents = () => {
  // ==================== STATE ====================
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    nis: '',
    class_id: '',
    parent_id: '',
    role: 'siswa',
    is_active: true,
  });

  // Dropdown & modal states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const fileInputRef = React.createRef();
  const dropdownRef = React.createRef();

  // ==================== FETCH DATA ====================
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/students/all');
      console.log('STUDENTS:', response.data);
      const data = response.data.data || [];
      setStudents(data);
    } catch (error) {
      console.error('FETCH STUDENTS ERROR:', error);
      setErrorMsg('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const response = await api.get('/users/parents');
      const data = response.data.data || [];
      setParents(data);
    } catch (error) {
      console.error('FETCH PARENTS ERROR:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const classes = response.data.data || [];
      setAvailableClasses(classes);
    } catch (error) {
      console.error('FETCH CLASSES ERROR:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchParents();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // ==================== HANDLERS ====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
          nis: formData.nis,
          class_id: formData.class_id,
          parent_id: formData.parent_id,
          is_active: formData.is_active,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/users/${editingStudent._id}`, updateData);
        setSuccessMsg('Data siswa berhasil diupdate');
      } else {
        await api.post('/users', formData);
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
        class_id: '',
        parent_id: '',
        role: 'siswa',
        is_active: true,
      });
      fetchStudents();
    } catch (error) {
      console.error('SAVE ERROR:', error);
      setErrorMsg(error.response?.data?.message || 'Gagal menyimpan data');
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
      class_id: student.class_id || '',
      parent_id: student.parent_id || '',
      role: 'siswa',
      is_active: student.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus siswa?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccessMsg('Siswa berhasil dihapus');
      fetchStudents();
    } catch (error) {
      console.error('DELETE ERROR:', error);
      setErrorMsg('Gagal menghapus siswa');
    }
  };

  const handleExport = async () => {
    setDropdownOpen(false);
    try {
      const response = await api.get('/admin/export/students', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'siswa.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Export siswa berhasil');
    } catch (error) {
      console.error(error);
      setErrorMsg('Gagal export siswa');
    }
  };

  const handleImportClick = () => {
    setDropdownOpen(false);
    fileInputRef.current.click();
  };

  const handleDownloadTemplate = async () => {
    setDropdownOpen(false);
    try {
      const response = await api.get('/admin/export/students-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_siswa.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMsg('Gagal download template');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/admin/import/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg(response.data.message || 'Import berhasil');
      fetchStudents();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Gagal import siswa');
    } finally {
      event.target.value = '';
    }
  };
  const handleShowDetail = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };
  const handleResetPassword = () => {};

  // ==================== FILTER & PAGINATION ====================
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_id === selectedClass;
    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === 'active' && student.is_active) ||
      (selectedStatus === 'inactive' && !student.is_active);
    return matchesSearch && matchesClass && matchesStatus;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const goToPage = (page) => setCurrentPage(page);
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-students-container">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" style={{ display: 'none' }} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-badge">Administrative Dashboard</span>
          <h2 className="admin-page-title">Kelola Siswa</h2>
        </div>
        <div className="header-buttons">
          <div className="dropdown" ref={dropdownRef}>
            <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span className="material-symbols-outlined">file_present</span> Data
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
            <span className="material-symbols-outlined">add</span> Tambah Siswa Baru
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="notification error">
          <span className="material-symbols-outlined">error</span> {errorMsg}
          <button className="notification-close" onClick={() => setErrorMsg('')}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="notification success">
          <span className="material-symbols-outlined">check_circle</span> {successMsg}
          <button className="notification-close" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}

      {/* Stats Card */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card students">
          <div className="admin-stat-header">
            <div className="admin-stat-icon"><span className="material-symbols-outlined">school</span></div>
          </div>
          <div className="admin-stat-info">
            <p className="admin-stat-label">Total Siswa</p>
            <p className="admin-stat-value">{students.length}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="admin-table-container">
        <div className="admin-table-filters">
          <div className="admin-filter-group">
            <div className="admin-filter-select">
              <span className="material-symbols-outlined">class</span>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Semua Kelas</option>
                {availableClasses.map((kelas) => (
                  <option key={kelas._id} value={kelas._id}>{kelas.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-filter-select">
              <span className="material-symbols-outlined">check_circle</span>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="admin-search-wrapper">
            <span className="material-symbols-outlined">search</span>
            <input type="text" placeholder="Cari berdasarkan nama, NIS, atau email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>Orang Tua</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan="6" className="admin-table-empty">Tidak ada data siswa</td></tr>
              ) : (
                currentItems.map((student) => (
                  <tr key={student.id}>
                    <td className="admin-user-info-cell">
                      <div className="admin-user-info" style={{ cursor: 'pointer' }} onClick={() => handleShowDetail(student)}>
                        <div className="admin-user-avatar"><span className="material-symbols-outlined">account_circle</span></div>
                        <div>
                          <p className="admin-user-name">{student.full_name || '-'}</p>
                          <p className="admin-user-email">{student.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="admin-user-id">{student.nis || '-'}</td>
                    <td className="admin-class-cell"><span className="admin-class-badge">{student.class_name || '-'}</span></td>
                    <td className="admin-parent-cell">{student.parent?.full_name || '-'}</td>
                    <td className="admin-status-cell">
                      <span className={`admin-status-badge ${student.is_active ? 'active' : 'inactive'}`}>
                        {student.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => handleEdit(student)} title="Edit">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="admin-action-btn reset" onClick={() => handleResetPassword(student)} title="Reset Password (siswa123)">
                        <span className="material-symbols-outlined">lock_reset</span>
                      </button>
                      <button className="admin-action-btn delete" onClick={() => handleDelete(student.id)} title="Delete">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className="admin-table-pagination">
            <p className="admin-pagination-info">
              Menampilkan <span className="font-bold">{filteredStudents.length === 0 ? 0 : indexOfFirstItem + 1}</span> -{' '}
              <span className="font-bold">{Math.min(indexOfLastItem, filteredStudents.length)}</span> dari{' '}
              <span className="font-bold">{filteredStudents.length}</span> Siswa
            </p>
            <div className="admin-pagination-controls">
              <button className="admin-page-btn" onClick={goToPrevPage} disabled={currentPage === 1}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                  return (
                    <button key={pageNumber} className={`admin-page-btn ${currentPage === pageNumber ? 'active' : ''}`} onClick={() => goToPage(pageNumber)}>
                      {pageNumber}
                    </button>
                  );
                } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={pageNumber} className="pagination-dots">...</span>;
                }
                return null;
              })}
              <button className="admin-page-btn" onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0}>
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
                  <input type="text" name="full_name" className="admin-students-form-input" value={formData.full_name} onChange={handleChange} required />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Email *</label>
                  <input type="email" name="email" className="admin-students-form-input" value={formData.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Username *</label>
                  <input type="text" name="username" className="admin-students-form-input" value={formData.username} onChange={handleChange} required />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Password {!editingStudent && '*'}</label>
                  <input type="password" name="password" className="admin-students-form-input" value={formData.password} onChange={handleChange} required={!editingStudent} placeholder={editingStudent ? 'Kosongkan jika tidak diubah' : ''} />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">NIS *</label>
                  <input type="text" name="nis" className="admin-students-form-input" value={formData.nis} onChange={handleChange} required />
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Kelas</label>
                  <select name="class_id" className="admin-students-form-select" value={formData.class_id} onChange={handleChange}>
                    <option value="">Pilih Kelas</option>
                    {availableClasses.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Orang Tua</label>
                  <select name="parent_id" className="admin-students-form-select" value={formData.parent_id} onChange={handleChange}>
                    <option value="">Pilih Orang Tua (Opsional)</option>
                    {parents.map((p) => (
                      <option key={p._id} value={p._id}>{p.full_name} - {p.phone || p.email}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-students-form-group">
                  <label className="admin-students-form-label">Status</label>
                  <select name="is_active" className="admin-students-form-select" value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}>
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
            <div className="detail-field"><strong>Nama Lengkap:</strong> {selectedStudent.full_name}</div>
            <div className="detail-field"><strong>NIS:</strong> {selectedStudent.nis}</div>
            <div className="detail-field"><strong>Email:</strong> {selectedStudent.email}</div>
            <div className="detail-field"><strong>Username:</strong> {selectedStudent.username}</div>
            <div className="detail-field"><strong>Kelas:</strong> {selectedStudent.class_name || '-'}</div>
            <div className="detail-field"><strong>Orang Tua:</strong> {selectedStudent.parent?.full_name || '-'}</div>
            <div className="detail-field"><strong>Nomor Telepon Ortu:</strong> {selectedStudent.parent?.phone || '-'}</div>
            <div className="detail-field"><strong>Status:</strong> {selectedStudent.is_active ? 'Aktif' : 'Nonaktif'}</div>
            <div className="detail-field"><strong>ID Siswa:</strong> {selectedStudent.id}</div>
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