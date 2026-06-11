
import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';

const AdminMapel = () => {

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editingSubject, setEditingSubject] =
    useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // =====================================
  // DROPDOWN & IMPORT EXPORT
  // =====================================

  const [dropdownOpen, setDropdownOpen] =
    useState(false);

  const [exportLoading, setExportLoading] =
    useState(false);

  const [importLoading, setImportLoading] =
    useState(false);

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // =====================================
  // FETCH DATA
  // =====================================

  useEffect(() => {

    fetchSubjects();

    const handleClickOutside = (event) => {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

  }, []);

  // =====================================
  // AUTO CLEAR NOTIFICATION
  // =====================================

  useEffect(() => {

    if (error || success) {

      const timer = setTimeout(() => {

        setError('');
        setSuccess('');

      }, 3000);

      return () => clearTimeout(timer);
    }

  }, [error, success]);

  // =====================================
  // FETCH SUBJECTS
  // =====================================

  const fetchSubjects = async () => {

    try {

      setLoading(true);

      const response =
        await api.get('/subjects');

      console.log(
        'SUBJECTS:',
        response.data
      );

      setSubjects(
        response.data.data || []
      );

    } catch (error) {

      console.error(
        'Error fetching subjects:',
        error
      );

      setError(
        'Gagal memuat data mata pelajaran'
      );

    } finally {

      setLoading(false);
    }
  };

  // =====================================
  // HANDLE CHANGE
  // =====================================

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

  // =====================================
  // HANDLE SUBMIT
  // =====================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);

    setError('');
    setSuccess('');

    try {

      if (editingSubject) {

        await api.put(
          `/subjects/${editingSubject._id}`,
          formData
        );

        setSuccess(
          'Mata pelajaran berhasil diupdate'
        );

      } else {

        await api.post(
          '/subjects',
          formData
        );

        setSuccess(
          'Mata pelajaran berhasil ditambahkan'
        );
      }

      setShowModal(false);

      setEditingSubject(null);

      setFormData({
        name: '',
        code: '',
        description: '',
        is_active: true
      });

      fetchSubjects();

    } catch (error) {

      console.error(error);

      setError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Gagal menyimpan data'
      );

    } finally {

      setLoading(false);
    }
  };

  // =====================================
  // HANDLE EDIT
  // =====================================

  const handleEdit = (subject) => {

    setEditingSubject(subject);

    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      description:
        subject.description || '',
      is_active:
        subject.is_active !== undefined
          ? subject.is_active
          : true
    });

    setShowModal(true);
  };

  // =====================================
  // HANDLE DELETE
  // =====================================

  const handleDelete = async (id) => {

    if (
      window.confirm(
        'Apakah Anda yakin ingin menghapus mata pelajaran ini?'
      )
    ) {

      try {

        await api.delete(
          `/subjects/${id}`
        );

        setSuccess(
          'Mata pelajaran berhasil dihapus'
        );

        fetchSubjects();

      } catch (error) {

        console.error(error);

        setError(
          'Gagal menghapus mata pelajaran'
        );
      }
    }
  };

  // =====================================
  // EXPORT
  // =====================================

  const handleExport = async () => {

    setExportLoading(true);

    setDropdownOpen(false);

    setError('');
    setSuccess('');

    try {

      const response =
        await api.get(
          '/admin/export/subjects',
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
        'mata_pelajaran.xlsx'
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setSuccess(
        'Export mata pelajaran berhasil!'
      );

    } catch (error) {

      console.error(
        'Export error:',
        error
      );

      setError(
        'Gagal mengexport data'
      );

    } finally {

      setExportLoading(false);
    }
  };

  // =====================================
  // IMPORT
  // =====================================

  const handleImportClick = () => {

    setDropdownOpen(false);

    fileInputRef.current.click();
  };

  const handleFileChange = async (
    event
  ) => {

    const file =
      event.target.files[0];

    if (!file) return;

    const fileExt =
      file.name
        .split('.')
        .pop()
        .toLowerCase();

    if (
      fileExt !== 'xlsx' &&
      fileExt !== 'xls'
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

      const response =
        await api.post(
          '/admin/import/subjects',
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

        console.error(
          'Import errors:',
          errors
        );

      } else {

        setSuccess(
          `Import berhasil! ${success_count} data mata pelajaran ditambahkan.`
        );
      }

      fetchSubjects();

    } catch (error) {

      console.error(
        'Import error:',
        error
      );

      setError(
        error.response?.data?.error ||
        'Gagal mengimport data'
      );

    } finally {

      setImportLoading(false);

      event.target.value = '';
    }
  };

  // =====================================
  // LOADING
  // =====================================

  if (
    loading &&
    subjects.length === 0
  ) {
    return (
      <div className="admin-loading">
        Memuat data...
      </div>
    );
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="admin-students-container">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      {/* HEADER */}

      <div className="admin-page-header">

        <div>
          <span className="admin-page-badge">
            Administrative Dashboard
          </span>

          <h2 className="admin-page-title">
            📖 Kelola Mata Pelajaran
          </h2>
        </div>

        <div className="header-buttons">

          <div
            className="dropdown"
            ref={dropdownRef}
          >

            <button
              className="dropdown-btn"
              onClick={() =>
                setDropdownOpen(
                  !dropdownOpen
                )
              }
            >
              <span className="material-symbols-outlined">
                file_present
              </span>

              Data

              <span className="material-symbols-outlined dropdown-arrow">
                expand_more
              </span>
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">

                <div className="dropdown-group">

                  <div className="dropdown-group-title">
                    EXPORT
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                  >
                    <span className="material-symbols-outlined">
                      download
                    </span>

                    {exportLoading
                      ? 'Mengexport...'
                      : 'Export Mata Pelajaran'}
                  </button>

                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-group">

                  <div className="dropdown-group-title">
                    IMPORT
                  </div>

                  <button
                    onClick={handleImportClick}
                    disabled={importLoading}
                  >
                    <span className="material-symbols-outlined">
                      upload_file
                    </span>

                    {importLoading
                      ? 'Mengimport...'
                      : 'Import Mata Pelajaran (Excel)'}
                  </button>

                </div>

              </div>
            )}
          </div>

          <button
            className="admin-add-user-btn"
            onClick={() =>
              setShowModal(true)
            }
          >
            <span className="material-symbols-outlined">
              add
            </span>

            Tambah Mata Pelajaran
          </button>

        </div>
      </div>

      {/* NOTIFICATION */}

      {error && (
        <div className="notification error">

          <span className="material-symbols-outlined">
            error
          </span>

          {error}

          <button
            className="notification-close"
            onClick={() =>
              setError('')
            }
          >
            ×
          </button>

        </div>
      )}

      {success && (
        <div className="notification success">

          <span className="material-symbols-outlined">
            check_circle
          </span>

          {success}

          <button
            className="notification-close"
            onClick={() =>
              setSuccess('')
            }
          >
            ×
          </button>

        </div>
      )}

      {/* TABLE */}

      <div className="admin-table-container">

        <div className="admin-table-wrapper">

          <table className="admin-table">

            <thead>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Nama Mata Pelajaran</th>
                <th>Deskripsi</th>
                <th>Status</th>
                <th className="text-right">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>

              {subjects.length === 0 ? (

                <tr>
                  <td
                    colSpan="6"
                    className="admin-table-empty"
                  >
                    Belum ada data mata pelajaran
                  </td>
                </tr>

              ) : (

                subjects.map(
                  (subject, idx) => (

                    <tr key={subject._id}>

                      <td>
                        {idx + 1}
                      </td>

                      <td>
                        {subject.code || '-'}
                      </td>

                      <td>
                        <strong>
                          {subject.name}
                        </strong>
                      </td>

                      <td>
                        {subject.description || '-'}
                      </td>

                      <td>

                        <span
                          className={`admin-status-badge ${
                            subject.is_active
                              ? 'active'
                              : 'inactive'
                          }`}
                        >
                          {subject.is_active
                            ? 'Aktif'
                            : 'Nonaktif'}
                        </span>

                      </td>

                      <td className="admin-table-actions">

                        <button
                          className="admin-action-btn edit"
                          onClick={() =>
                            handleEdit(subject)
                          }
                          title="Edit"
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                        </button>

                        <button
                          className="admin-action-btn delete"
                          onClick={() =>
                            handleDelete(
                              subject._id
                            )
                          }
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">
                            delete
                          </span>
                        </button>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>
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
            className="admin-students-modal modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>
              {editingSubject
                ? 'Edit Mata Pelajaran'
                : 'Tambah Mata Pelajaran Baru'}
            </h3>

            <form onSubmit={handleSubmit}>

              <div className="admin-students-form-row">

                <div className="admin-students-form-group">

                  <label>
                    Nama Mata Pelajaran *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="admin-students-form-group">

                  <label>
                    Kode
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Contoh: MATH01"
                  />

                </div>

              </div>

              <div className="admin-students-form-group">

                <label>
                  Deskripsi
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Deskripsi mata pelajaran..."
                />

              </div>

              <div className="admin-students-form-row">

                <div className="admin-students-form-group">

                  <label>
                    Status
                  </label>

                  <select
                    name="is_active"
                    value={
                      formData.is_active
                        ? 'active'
                        : 'inactive'
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active:
                          e.target.value ===
                          'active'
                      })
                    }
                  >
                    <option value="active">
                      Aktif
                    </option>

                    <option value="inactive">
                      Nonaktif
                    </option>

                  </select>

                </div>

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

export default AdminMapel;

