import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import SearchableMultiSelect from '../../../components/Common/SearchableMultiSelect';
import '../../../styles/dashboard/admin/admin-parents.css';

const AdminParents = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    nik: '',
    phone: '',
    children: [],
    is_active: true,
  });

  useEffect(() => {
    fetchParents();
    fetchStudents();
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/parents');
      setParents(res.data.data || []);
    } catch (err) {
      console.error('Gagal ambil data orang tua', err);
      setErrorMsg('Gagal memuat data orang tua');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/users/students/all');
      const studentsData = res.data.data || [];
      setStudents(studentsData);
      if (studentsData.length === 0) {
        console.warn('Tidak ada data siswa, dropdown anak akan kosong');
      }
    } catch (err) {
      console.error('Gagal ambil data siswa', err);
      setErrorMsg('Gagal memuat data siswa');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          nik: formData.nik,
          phone: formData.phone,
          children: formData.children,
          is_active: formData.is_active,
        };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/users/parents/${editing._id}`, updateData);
        setSuccessMsg('Data orang tua berhasil diupdate');
      } else {
        await api.post('/users/parents', formData);
        setSuccessMsg('Data orang tua berhasil ditambahkan');
      }
      setShowModal(false);
      resetForm();
      fetchParents();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data');
    }
  };

  const handleEdit = (parent) => {
    setEditing(parent);
    setFormData({
      full_name: parent.full_name || '',
      email: parent.email || '',
      password: '',
      nik: parent.nik || '',
      phone: parent.phone || '',
      children: parent.children?.map((c) => c._id || c) || [],
      is_active: parent.is_active !== undefined ? parent.is_active : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data orang tua ini?')) return;
    try {
      await api.delete(`/users/parents/${id}`);
      setSuccessMsg('Orang tua berhasil dihapus');
      fetchParents();
      // Refresh students list too because child association changed
      fetchStudents();
      resetForm();
      setShowModal(false);
    } catch (err) {
      setErrorMsg('Gagal menghapus data');
    }
  };

  const handleResetPassword = async (parent) => {
    if (!window.confirm(`Yakin ingin mereset password orang tua ${parent.full_name} menjadi 'ortu123'?`)) return;
    try {
      await api.put(`/users/${parent._id || parent.id}`, { password: 'ortu123' });
      setSuccessMsg('Password orang tua berhasil direset menjadi ortu123');
    } catch (error) {
      console.error('RESET PASSWORD ERROR:', error);
      setErrorMsg('Gagal mereset password orang tua');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      nik: '',
      phone: '',
      children: [],
      is_active: true,
    });
    setEditing(null);
  };

  const handleShowDetail = (parent) => {
    setSelectedParent(parent);
    setShowDetailModal(true);
  };

  const filteredParents = parents.filter((p) => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nik?.includes(searchTerm);
    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === 'active' && p.is_active) ||
      (selectedStatus === 'inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredParents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredParents.slice(indexOfFirstItem, indexOfLastItem);
  const goToPage = (page) => setCurrentPage(page);
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleExport = async () => {
    setDropdownOpen(false);
    try {
      const res = await api.get('/admin/export/parents', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'orang_tua.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('Gagal export data');
    }
  };

  const handleImportClick = () => {
    setDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const response = await api.post('/admin/import/parents', fd);
      const { success_count, error_count, errors } = response.data;
      if (success_count > 0 && error_count > 0) {
        setSuccessMsg(`Import selesai: ${success_count} berhasil dimasukkan.`);
        if (errors && errors.length > 0) {
          console.error('Import errors:', errors);
          setErrorMsg(`Sebagian data (${error_count} baris) gagal diimport. Contoh kesalahan: ${errors.slice(0, 3).join(', ')}`);
        }
      } else if (success_count > 0 && error_count === 0) {
        setSuccessMsg(`Import berhasil! ${success_count} data orang tua ditambahkan.`);
      } else {
        setErrorMsg(`Gagal mengimport. Semua data (${error_count} baris) gagal diimport.`);
        if (errors && errors.length > 0) {
          console.error('Import errors:', errors);
          setErrorMsg(prev => `${prev} Kesalahan: ${errors.slice(0, 3).join(', ')}`);
        }
      }
      fetchParents();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Gagal import data');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    setDropdownOpen(false);
    setTemplateLoading(true);
    try {
      const res = await api.get('/admin/export/parents-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_orang_tua.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setErrorMsg('Gagal download template');
    } finally {
      setTemplateLoading(false);
    }
  };

  if (loading) return <div className="loading">Memuat data...</div>;

  return (
    <div className="admin-parents">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" style={{ display: 'none' }} />

      <div className="admin-page-header">
        <div>
          <span className="admin-page-badge">Administrative Dashboard</span>
          <h2 className="admin-page-title">Kelola Orang Tua</h2>
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
                  <button onClick={handleExport}>
                    <span className="material-symbols-outlined">family_restroom</span> Export Orang Tua
                  </button>
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-group">
                  <div className="dropdown-group-title">IMPORT</div>
                  <button onClick={handleImportClick} disabled={importLoading}>
                    <span className="material-symbols-outlined">upload_file</span>
                    {importLoading ? 'Mengimport...' : 'Import Orang Tua (Excel)'}
                  </button>
                </div>
                <div className="dropdown-divider" />
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
          <button className="admin-add-user-btn" onClick={() => { resetForm(); setShowModal(true); }}>
            <span className="material-symbols-outlined">add</span> Tambah Orang Tua
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

      <div className="admin-stats-grid">
        <div className="admin-stat-card parents">
          <div className="admin-stat-header">
            <div className="admin-stat-icon"><span className="material-symbols-outlined">family_restroom</span></div>
          </div>
          <div className="admin-stat-info">
            <p className="admin-stat-label">Total Orang Tua</p>
            <p className="admin-stat-value">{parents.length}</p>
          </div>
        </div>
      </div>

      <div className="admin-table-filters">
        <div className="admin-filter-group">
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
          <input
            type="text"
            placeholder="Cari berdasarkan nama, email, atau NIK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Lengkap</th>
              <th>Email</th>
              <th>NIK</th>
              <th>Telepon</th>
              <th>Anak</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr><td colSpan="8" className="empty">Belum ada data orang tua</td></tr>
            ) : (
              currentItems.map((parent, idx) => (
                <tr key={parent._id}>
                  <td>{indexOfFirstItem + idx + 1}</td>
                  <td className="clickable" onClick={() => handleShowDetail(parent)} style={{ cursor: 'pointer', color: '#0040a1', fontWeight: 500 }}>
                    {parent.full_name}
                  </td>
                  <td>{parent.email}</td>
                  <td>{parent.nik || '-'}</td>
                  <td>{parent.phone || '-'}</td>
                  <td className="children-cell">
                    {parent.children?.map((c) => c.full_name || c).join(', ') || '-'}
                  </td>
                  <td>
                    <span className={`status-badge ${parent.is_active ? 'active' : 'inactive'}`}>
                      {parent.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(parent)} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="btn-reset" onClick={() => handleResetPassword(parent)} title="Reset Password (ortu123)" style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
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
            Menampilkan {totalItems === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} dari {totalItems} Orang Tua
          </p>
          <div className="admin-pagination-controls">
            <button className="admin-page-btn" onClick={goToPrevPage} disabled={currentPage === 1}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (totalPages <= 5 || pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                return (
                  <button key={pageNum} className={`admin-page-btn ${currentPage === pageNum ? 'active' : ''}`} onClick={() => goToPage(pageNum)}>
                    {pageNum}
                  </button>
                );
              } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <span key={pageNum} className="pagination-dots">...</span>;
              }
              return null;
            })}
            <button className="admin-page-btn" onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Orang Tua' : 'Tambah Orang Tua Baru'}</h3>
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
                  <label>Password {!editing && '*'}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required={!editing} placeholder={editing ? 'Kosongkan jika tidak diubah' : ''} />
                </div>
                <div className="admin-students-form-group">
                  <label>NIK</label>
                  <input type="text" name="nik" value={formData.nik} onChange={handleChange} />
                </div>
              </div>
              <div className="admin-students-form-row">
                <div className="admin-students-form-group">
                  <label>Nomor Telepon</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="admin-students-form-group">
                  <label>Status</label>
                  <select name="is_active" value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>Anak (Pilih satu atau lebih siswa)</label>
                <SearchableMultiSelect
                  options={students.map((s) => ({
                    value: s._id || s.id,
                    label: s.full_name,
                    sublabel: `NIS: ${s.nis || '-'} ${s.class_name ? '| Kelas: ' + s.class_name : ''}`
                  }))}
                  value={formData.children}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, children: selected }))}
                  placeholder="Cari dan pilih siswa..."
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedParent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Detail Orang Tua</h3>
            <div className="detail-field"><strong>Nama Lengkap:</strong> {selectedParent.full_name}</div>
            <div className="detail-field"><strong>Email:</strong> {selectedParent.email}</div>
            <div className="detail-field"><strong>NIK:</strong> {selectedParent.nik || '-'}</div>
            <div className="detail-field"><strong>Telepon:</strong> {selectedParent.phone || '-'}</div>
            <div className="detail-field"><strong>Anak:</strong> {selectedParent.children?.map((c) => c.full_name || c).join(', ') || '-'}</div>
            <div className="detail-field"><strong>Status:</strong> {selectedParent.is_active ? 'Aktif' : 'Nonaktif'}</div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setShowDetailModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParents;