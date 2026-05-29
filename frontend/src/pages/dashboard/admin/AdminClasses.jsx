import React, { useState, useEffect, useRef } from 'react';
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

  // ==========================================
  // MASTER DATA
  // ==========================================
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // ==========================================
  // EXPORT / IMPORT
  // ==========================================
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ==========================================
  // FETCH INITIAL DATA
  // ==========================================
  useEffect(() => {

    fetchClasses();
    fetchTeachers();
    fetchAcademicYears();

    const handleClickOutside = (event) => {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };

  }, []);

  // ==========================================
  // AUTO HIDE NOTIFICATION
  // ==========================================
  useEffect(() => {

    if (error || success) {

      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);

      return () => clearTimeout(timer);
    }

  }, [error, success]);

  // ==========================================
  // FETCH CLASSES
  // ==========================================
  const fetchClasses = async () => {

    try {

      setLoading(true);

      const response = await api.get('/classes');

      console.log('CLASSES:', response.data);

      setClasses(response.data.data || []);

    } catch (error) {

      console.error(
        'Error fetching classes:',
        error
      );

      setError('Gagal memuat data kelas');

    } finally {

      setLoading(false);
    }
  };

  // ==========================================
  // FETCH TEACHERS
  // ==========================================
  const fetchTeachers = async () => {

    try {

      const response = await api.get(
        '/users/teachers/all'
      );

      console.log(
        'TEACHERS:',
        response.data
      );

      setTeachers(response.data.data || []);

    } catch (error) {

      console.error(
        'Error fetching teachers:',
        error
      );

      setTeachers([]);
    }
  };

  // ==========================================
  // FETCH ACADEMIC YEARS
  // ==========================================
  const fetchAcademicYears = async () => {

    try {

      const response = await api.get(
        '/academic-years'
      );

      console.log(
        'ACADEMIC YEARS:',
        response.data
      );

      setAcademicYears(
        response.data.data || []
      );

    } catch (error) {

      console.error(
        'Error fetching academic years:',
        error
      );

      setAcademicYears([]);
    }
  };

  // ==========================================
  // HANDLE INPUT
  // ==========================================
  const handleChange = (e) => {

    const {
      name,
      value,
      type,
      checked
    } = e.target;

    setFormData({
      ...formData,
      [name]:
        type === 'checkbox'
          ? checked
          : value
    });
  };

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    try {

      if (editingClass) {

        await api.put(
          `/classes/${editingClass._id}`,
          formData
        );

        setSuccess(
          'Kelas berhasil diupdate'
        );

      } else {

        await api.post(
          '/classes',
          formData
        );

        setSuccess(
          'Kelas berhasil ditambahkan'
        );
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

      console.error(error);

      setError(
        error.response?.data?.message ||
        'Gagal menyimpan data'
      );

    } finally {

      setLoading(false);
    }
  };

  // ==========================================
  // EDIT
  // ==========================================
  const handleEdit = (cls) => {

    setEditingClass(cls);

    setFormData({
      name: cls.name || '',
      grade_level:
        cls.grade_level || '',
      homeroom_teacher:
        cls.homeroom_teacher || '',
      academic_year_id:
        cls.academic_year_id || '',
      is_active:
        cls.is_active !== undefined
          ? cls.is_active
          : true
    });

    setShowModal(true);
  };

  // ==========================================
  // DELETE
  // ==========================================
  const handleDelete = async (id) => {

    if (
      window.confirm(
        'Apakah Anda yakin ingin menghapus kelas ini?'
      )
    ) {

      try {

        await api.delete(
          `/classes/${id}`
        );

        setSuccess(
          'Kelas berhasil dihapus'
        );

        fetchClasses();

      } catch (error) {

        console.error(error);

        setError(
          'Gagal menghapus kelas'
        );
      }
    }
  };

  // ==========================================
  // EXPORT
  // ==========================================
  const handleExport = async () => {

    setExportLoading(true);

    setDropdownOpen(false);

    setError('');
    setSuccess('');

    try {

      const response = await api.get(
        '/export/classes',
        {
          responseType: 'blob'
        }
      );

      const url =
        window.URL.createObjectURL(
          new Blob([response.data])
        );

      const link =
        document.createElement('a');

      link.href = url;

      link.setAttribute(
        'download',
        'kelas.xlsx'
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setSuccess(
        'Export data kelas berhasil!'
      );

    } catch (error) {

      console.error(error);

      setError(
        'Gagal mengexport data'
      );

    } finally {

      setExportLoading(false);
    }
  };

  // ==========================================
  // IMPORT BUTTON
  // ==========================================
  const handleImportClick = () => {

    setDropdownOpen(false);

    fileInputRef.current.click();
  };

  // ==========================================
  // IMPORT FILE
  // ==========================================
  const handleFileChange = async (
    event
  ) => {

    const file =
      event.target.files[0];

    if (!file) return;

    const ext =
      file.name
        .split('.')
        .pop()
        .toLowerCase();

    if (
      ext !== 'xlsx' &&
      ext !== 'xls'
    ) {

      setError(
        'Format file harus .xlsx atau .xls'
      );

      return;
    }

    setImportLoading(true);

    setError('');
    setSuccess('');

    try {

      const formDataImport =
        new FormData();

      formDataImport.append(
        'file',
        file
      );

      const response = await api.post(
        '/import/classes',
        formDataImport,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

      const {
        success_count,
        error_count,
        errors
      } = response.data;

      if (error_count > 0) {

        setError(
          `Import selesai: ${success_count} berhasil, ${error_count} gagal.`
        );

        console.error(errors);

      } else {

        setSuccess(
          `Import berhasil! ${success_count} data kelas ditambahkan.`
        );
      }

      fetchClasses();

    } catch (error) {

      console.error(error);

      setError(
        error.response?.data?.error ||
        'Gagal import data'
      );

    } finally {

      setImportLoading(false);

      event.target.value = '';
    }
  };

  // ==========================================
  // GRADE OPTIONS
  // ==========================================
  const gradeOptions = [
    {
      value: 7,
      label: 'Kelas 7'
    },
    {
      value: 8,
      label: 'Kelas 8'
    },
    {
      value: 9,
      label: 'Kelas 9'
    }
  ];

  // ==========================================
  // LOADING
  // ==========================================
  if (
    loading &&
    classes.length === 0
  ) {
    return (
      <div className="admin-loading">
        Memuat data...
      </div>
    );
  }

  return (
    <div className="admin-classes-container">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* HEADER */}
      <div className="page-header">

        <h2 className="page-title">
          📚 Kelola Kelas
        </h2>

        <div className="button-group">

          <div
            className="dropdown"
            ref={dropdownRef}
          >

            <button
              className="btn-export"
              onClick={() =>
                setDropdownOpen(
                  !dropdownOpen
                )
              }
            >
              📂 Data
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">

                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                >
                  {exportLoading
                    ? 'Mengexport...'
                    : 'Export Excel'}
                </button>

                <button
                  onClick={
                    handleImportClick
                  }
                  disabled={
                    importLoading
                  }
                >
                  {importLoading
                    ? 'Mengimport...'
                    : 'Import Excel'}
                </button>

              </div>
            )}
          </div>

          <button
            className="btn-add"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Tambah Kelas
          </button>

        </div>
      </div>

      {/* NOTIFICATION */}
      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
        </div>
      )}

      {/* TABLE */}
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
                <td
                  colSpan="7"
                  className="empty-state"
                >
                  Belum ada data kelas
                </td>
              </tr>
            ) : (
              classes.map(
                (cls, idx) => (
                  <tr key={cls._id}>

                    <td>
                      {idx + 1}
                    </td>

                    <td>
                      <strong>
                        {cls.name}
                      </strong>
                    </td>

                    <td>
                      {cls.grade_level
                        ? `Kelas ${cls.grade_level}`
                        : '-'}
                    </td>

                    <td>
                      {cls.homeroom_teacher_name ||
                        '-'}
                    </td>

                    <td>
                      {cls.academic_year_name ||
                        '-'}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          cls.is_active
                            ? 'active'
                            : 'inactive'
                        }`}
                      >
                        {cls.is_active
                          ? 'Aktif'
                          : 'Nonaktif'}
                      </span>
                    </td>

                    <td className="actions">

                      <button
                        className="btn-edit"
                        onClick={() =>
                          handleEdit(cls)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() =>
                          handleDelete(
                            cls._id
                          )
                        }
                      >
                        Hapus
                      </button>

                    </td>
                  </tr>
                )
              )
            )}

          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>
              {editingClass
                ? 'Edit Kelas'
                : 'Tambah Kelas Baru'}
            </h3>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label>
                  Nama Kelas *
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={
                    handleChange
                  }
                  placeholder="Contoh: 7A"
                  required
                />
              </div>

              <div className="form-group">

                <label>
                  Tingkat
                </label>

                <select
                  name="grade_level"
                  value={
                    formData.grade_level
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Pilih Tingkat
                  </option>

                  {gradeOptions.map(
                    (opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">

                <label>
                  Wali Kelas
                </label>

                <select
                  name="homeroom_teacher"
                  value={
                    formData.homeroom_teacher
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Pilih Wali Kelas
                  </option>

                  {teachers.map(
                    (guru) => (
                      <option
                        key={guru._id}
                        value={guru._id}
                      >
                        {guru.full_name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">

                <label>
                  Tahun Ajaran
                </label>

                <select
                  name="academic_year_id"
                  value={
                    formData.academic_year_id
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Pilih Tahun Ajaran
                  </option>

                  {academicYears.map(
                    (ta) => (
                      <option
                        key={ta._id}
                        value={ta._id}
                      >
                        {ta.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group checkbox">

                <label>

                  <input
                    type="checkbox"
                    name="is_active"
                    checked={
                      formData.is_active
                    }
                    onChange={
                      handleChange
                    }
                  />

                  Aktif

                </label>
              </div>

              <div className="modal-buttons">

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn-save"
                  disabled={loading}
                >
                  {loading
                    ? 'Menyimpan...'
                    : 'Simpan'}
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