import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru.css';

const GuruCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', category: '', level: 'beginner' });
      fetchCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Gagal membuat kursus');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="guru-dashboard-content">
      <div className="page-header">
        <h2 className="page-title">Kursus Saya</h2>
        <p className="page-subtitle">Kelola bahan ajar dan mata pelajaran yang Anda ampu</p>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div key={course._id} className="course-card">
            <div className="course-header">
              <div className="course-icon"><span className="material-symbols-outlined">menu_book</span></div>
              <span className={`status-badge ${course.status || 'active'}`}>{course.status || 'Aktif'}</span>
            </div>
            <h3>{course.name}</h3>
            <div className="course-meta">
              <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>groups</span> {course.total_students || 0} siswa</span>
              <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>bar_chart</span> {course.level}</span>
            </div>
            <div className="course-actions">
              <button className="btn-view">Lihat Detail</button>
              <button className="btn-edit">Edit</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buat Kursus Baru</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul Kursus</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Deskripsi</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" required />
              </div>
              <div className="form-group">
                <label>Kategori</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="">Pilih Kategori</option>
                  <option value="Matematika">Matematika</option>
                  <option value="IPA">IPA</option>
                  <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                  <option value="Bahasa Inggris">Bahasa Inggris</option>
                </select>
              </div>
              <div className="form-group">
                <label>Level</label>
                <select name="level" value={formData.level} onChange={handleChange}>
                  <option value="beginner">Pemula</option>
                  <option value="intermediate">Menengah</option>
                  <option value="advanced">Lanjutan</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-save">Buat Kursus</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruCourses;