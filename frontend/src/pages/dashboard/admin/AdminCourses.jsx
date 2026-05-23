import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-courses.css';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    instructor_id: '',
    price: 0,
    thumbnail: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        api.get('/courses'),
        api.get('/users/teachers')
      ]);
      setCourses(coursesRes.data.courses);
      setTeachers(teachersRes.data.teachers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, formData);
        alert('Kursus berhasil diupdate');
      } else {
        await api.post('/courses', formData);
        alert('Kursus berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', category: '', level: 'beginner', instructor_id: '', price: 0, thumbnail: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Gagal menyimpan kursus');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      instructor_id: course.instructor_id,
      price: course.price,
      thumbnail: course.thumbnail || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kursus ini?')) {
      try {
        await api.delete(`/courses/${id}`);
        alert('Kursus berhasil dihapus');
        fetchData();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Gagal menghapus kursus');
      }
    }
  };

  const getTeacherName = (id) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? teacher.full_name : 'Tidak diketahui';
  };

  const getLevelLabel = (level) => {
    const labels = { beginner: 'Pemula', intermediate: 'Menengah', advanced: 'Lanjutan' };
    return labels[level] || level;
  };

  const getLevelColor = (level) => {
    const colors = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };
    return colors[level] || 'beginner';
  };

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="courses-loading">Memuat data kursus...</div>;

  return (
    <div className="courses-container">
      {/* Page Header */}
      <div className="courses-header">
        <div>
          <span className="courses-badge">Academic Catalog</span>
          <h2 className="courses-title">Kelola Kursus</h2>
          <p className="courses-subtitle">Kelola dan atur semua kursus yang tersedia di platform</p>
        </div>
        <button className="courses-add-btn" onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined">add</span>
          Tambah Kursus Baru
        </button>
      </div>

      {/* Stats Summary */}
      <div className="courses-stats">
        <div className="stat-item">
          <span className="material-symbols-outlined">menu_book</span>
          <div>
            <h4>{courses.length}</h4>
            <p>Total Kursus</p>
          </div>
        </div>
        <div className="stat-item">
          <span className="material-symbols-outlined">person_pin</span>
          <div>
            <h4>{teachers.length}</h4>
            <p>Total Pengajar</p>
          </div>
        </div>
        <div className="stat-item">
          <span className="material-symbols-outlined">category</span>
          <div>
            <h4>{[...new Set(courses.map(c => c.category))].length}</h4>
            <p>Kategori</p>
          </div>
        </div>
        <div className="stat-item">
          <span className="material-symbols-outlined">school</span>
          <div>
            <h4>{courses.reduce((sum, c) => sum + (c.total_students || 0), 0)}</h4>
            <p>Total Enrolmen</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="courses-filter-bar">
        <div className="filter-search">
          <span className="material-symbols-outlined">search</span>
          <input 
            type="text" 
            placeholder="Cari judul kursus..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-select">
          <span className="material-symbols-outlined">filter_list</span>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="Matematika">Matematika</option>
            <option value="IPA">IPA</option>
            <option value="Bahasa Indonesia">Bahasa Indonesia</option>
            <option value="Bahasa Inggris">Bahasa Inggris</option>
            <option value="IPS">IPS</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="courses-grid">
        {filteredCourses.length === 0 ? (
          <div className="courses-empty">
            <span className="material-symbols-outlined">book_online</span>
            <p>Belum ada kursus</p>
          </div>
        ) : (
          filteredCourses.map(course => (
            <div key={course._id} className="course-card">
              <div className="course-thumbnail">
                <span className="material-symbols-outlined">auto_stories</span>
                <span className={`course-level-badge ${getLevelColor(course.level)}`}>
                  {getLevelLabel(course.level)}
                </span>
              </div>
              <div className="course-content">
                <h3 className="course-title">{course.title}</h3>
                <p className="course-description">{course.description?.substring(0, 80)}...</p>
                <div className="course-meta">
                  <div className="meta-item">
                    <span className="material-symbols-outlined">person</span>
                    <span>{getTeacherName(course.instructor_id)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="material-symbols-outlined">category</span>
                    <span>{course.category}</span>
                  </div>
                  <div className="meta-item">
                    <span className="material-symbols-outlined">groups</span>
                    <span>{course.total_students || 0} siswa</span>
                  </div>
                </div>
                <div className="course-footer">
                  <div className="course-price">
                    {course.price === 0 ? 'Gratis' : `Rp ${course.price.toLocaleString()}`}
                  </div>
                  <div className="course-actions">
                    <button className="action-btn edit" onClick={() => handleEdit(course)} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(course._id)} title="Hapus">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="courses-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCourse ? 'Edit Kursus' : 'Tambah Kursus Baru'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Judul Kursus *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Masukkan judul kursus"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Kategori *</label>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="">Pilih Kategori</option>
                    <option value="Matematika">Matematika</option>
                    <option value="IPA">IPA</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Bahasa Inggris">Bahasa Inggris</option>
                    <option value="IPS">IPS</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Level *</label>
                  <select name="level" value={formData.level} onChange={handleChange}>
                    <option value="beginner">Pemula</option>
                    <option value="intermediate">Menengah</option>
                    <option value="advanced">Lanjutan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Pengajar *</label>
                  <select name="instructor_id" value={formData.instructor_id} onChange={handleChange} required>
                    <option value="">Pilih Pengajar</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Deskripsi *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Masukkan deskripsi kursus"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Harga (Rp)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0 untuk gratis"
                  />
                </div>
                <div className="form-group">
                  <label>URL Thumbnail</label>
                  <input
                    type="text"
                    name="thumbnail"
                    value={formData.thumbnail}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-save">
                  {editingCourse ? 'Update Kursus' : 'Simpan Kursus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;