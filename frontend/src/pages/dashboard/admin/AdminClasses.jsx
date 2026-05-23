import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../../services/admin';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-classes.css';

const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    homeroom_teacher: '',
    academic_year_id: '',
    is_active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data untuk dropdown
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // State export/import
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch data master
  const fetchTeachers = async () => {
    try {
      const response = await api.get('/admin/teachers/options'); // asumsikan endpoint ini ada
      setTeachers(response.data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/admin/academic-years/options');
      setAcademicYears(response.data.academic_years || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      setAcademicYears([]);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchAcademicYears();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await adminService.getClasses();
      setClasses(response.classes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Gagal memuat data kelas');
      setLoading(false);
    }
  };

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
      if (editingClass) {
        await adminService.updateClass(editingClass._id, formData);
        setSuccess('Kelas berhasil diupdate');
      } else {
        await adminService.createClass(formData);
        setSuccess('Kelas berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingClass(null);
      setFormData({
        name: '',
        grade_level: '',
        homeroom_teacher: '',
        academic_year_id: '',
        is_active: true
      });
      fetchClasses();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level || '',
      homeroom_teacher: cls.homeroom_teacher || '',
      academic_year_id: cls.academic_year_id || '',
      is_active: cls.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kelas ini?')) {
      try {
        await adminService.deleteClass(id);
        setSuccess('Kelas berhasil dihapus');
        fetchClasses();
      } catch (error) {
        setError('Gagal menghapus kelas');
      }
    }
  };

  // Export/Import functions (sama seperti sebelumnya)
  const handleExport = async () => {
    setExportLoading(true);
    setError('');
    try {
      const blob = await adminService.exportClasses();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'kelas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Export data kelas berhasil!');
    } catch (error) {
      setError('Gagal mengexport data.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Format file harus .xlsx atau .xls');
      return;
    }
    setImportLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await adminService.importClasses(file);
      const { success_count, error_count, errors } = result;
      if (error_count > 0) {
        setError(`Import selesai dengan ${error_count} error. ${success_count} data berhasil.`);
        console.error(errors);
      } else {
        setSuccess(`Import berhasil! ${success_count} data kelas ditambahkan.`);
      }
      fetchClasses();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal mengimport data.');
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  const gradeOptions = [
    { value: 7, label: 'Kelas 7' },
    { value: 8, label: 'Kelas 8' },
    { value: 9, label: 'Kelas 9' }
  ];

  if (loading && classes.length === 0) {
    return <div className="admin-loading">Memuat data...</div>;
  }

  return (
    <div className="admin-classes-container">
      <div className="page-header">
        <h2 className="page-title">📚 Kelola Kelas</h2>
        <div className="button-group">
          <button className="btn-add" onClick={() => setShowModal(true)}>+ Tambah Kelas</button>
          <button className="btn-export" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? '⏳ Mengexport...' : '📥 Export ke Excel'}
          </button>
          <button className="btn-import" onClick={handleImportClick} disabled={importLoading}>
            {importLoading ? '⏳ Mengimport...' : '📤 Import dari Excel'}
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="classes-table-container">
        <table className="classes-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Kelas</th>
              <th>Tingkat</th>
              <th>Wali Kelas</th>
              <th>Tahun Ajaran</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">Belum ada data kelas</td>
              </tr>
            ) : (
              classes.map((cls, idx) => (
                <tr key={cls._id}>
                  <td>{idx + 1}</td>
                  <td><strong>{cls.name}</strong></td>
                  <td>{cls.grade_level ? `Kelas ${cls.grade_level}` : '-'}</td>
                  <td>{cls.homeroom_teacher_name || '-'}</td>
                  <td>{cls.academic_year_name || '-'}</td>
                  <td>
                    <span className={`status-badge ${cls.is_active ? 'active' : 'inactive'}`}>
                      {cls.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(cls)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(cls._id)}>Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Kelas *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: 7A"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tingkat</label>
                <select name="grade_level" value={formData.grade_level} onChange={handleChange}>
                  <option value="">Pilih Tingkat</option>
                  {gradeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Wali Kelas</label>
                <select name="homeroom_teacher" value={formData.homeroom_teacher} onChange={handleChange}>
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map(guru => (
                    <option key={guru._id} value={guru._id}>
                      {guru.full_name} ({guru.nip})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tahun Ajaran</label>
                <select name="academic_year_id" value={formData.academic_year_id} onChange={handleChange}>
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map(ta => (
                    <option key={ta._id} value={ta._id}>
                      {ta.name} {ta.is_active ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  Aktif
                </label>
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClasses;