import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru.css';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const getCurrentDayName = () => {
  const dayIdx = new Date().getDay();
  const dayMap = {
    1: 'SENIN',
    2: 'SELASA',
    3: 'RABU',
    4: 'KAMIS',
    5: 'JUMAT',
    6: 'SABTU'
  };
  return dayMap[dayIdx] || 'SENIN';
};

const GuruCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner'
  });

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const courseRes = await api.get('/courses');
      setCourses(courseRes.data.courses || []);

      const profileRes = await api.get('/profile');
      setTeacherProfile(profileRes.data);

      if (profileRes.data?._id) {
        try {
          const schedRes = await api.get(`/schedules/teacher/${profileRes.data._id}`);
          setSchedules(schedRes.data.schedule || []);
        } catch (e) {
          console.warn('Fallback all schedules fetch:', e);
          const allSched = await api.get('/schedules');
          setSchedules(allSched.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading Modul Guru data:', error);
    } finally {
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
      loadPageData();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Gagal membuat kursus');
    }
  };

  if (loading) return <div className="loading" style={{ padding: '30px', textAlign: 'center' }}>Memuat Modul Guru & Jadwal...</div>;

  const currentDayName = getCurrentDayName();
  const filteredSchedules = schedules.filter(s => (s.day || '').toUpperCase() === selectedDay.toUpperCase());

  return (
    <div className="guru-dashboard-content" style={{ padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h2 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          Modul Guru & Jadwal Mengajar (KBM)
        </h2>
        <p className="page-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
          Kelola bahan ajar dan lihat jadwal sesi mengajar Anda
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* SISI KIRI: DAFTAR KURSUS & MODUL GURU */}
        <div style={{ flex: '1 1 580px', minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>menu_book</span>
              Daftar Modul Guru ({courses.length})
            </h3>
            <button 
              onClick={() => setShowModal(true)}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Buat Modul Baru
            </button>
          </div>

          <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {courses.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', width: '100%', gridColumn: '1 / -1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>library_books</span>
                <p style={{ margin: '8px 0 4px 0', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Belum Ada Modul Guru</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Klik tombol "Buat Modul Baru" untuk menambahkan modul pembelajaran.</p>
              </div>
            ) : (
              courses.map(course => (
                <div key={course._id} className="course-card" style={{ background: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div className="course-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div className="course-icon" style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '10px', display: 'inline-flex' }}>
                      <span className="material-symbols-outlined">menu_book</span>
                    </div>
                    <span className={`status-badge ${course.status || 'active'}`} style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                      {course.status || 'Aktif'}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{course.title || course.name}</h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description || 'Tidak ada deskripsi singkat.'}
                  </p>
                  <div className="course-meta" style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#475569', marginBottom: '14px' }}>
                    <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>groups</span> {course.total_students || 0} siswa</span>
                    <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>bar_chart</span> {course.level || 'Umum'}</span>
                  </div>
                  <div className="course-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-view" style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Lihat Detail</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SISI KANAN KECIL: WIDGET JADWAL MENGAJAR GURU */}
        <div style={{ flex: '0 0 340px', width: '340px' }}>
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>calendar_month</span>
                  Jadwal Mengajar Saya
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>KBM & Sesi Kelas Aktif</span>
              </div>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                {currentDayName === selectedDay ? 'Hari Ini' : selectedDay}
              </span>
            </div>

            {/* TAB FILTER HARI */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedDay === day ? '#0284c7' : '#f1f5f9',
                    color: selectedDay === day ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* DAFTAR JADWAL MENGAJAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredSchedules.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>event_available</span>
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                    Tidak ada jadwal mengajar pada hari {selectedDay}.
                  </p>
                </div>
              ) : (
                filteredSchedules.map((item, idx) => {
                  const className = item.class_id?.name || item.class_name || 'Kelas';
                  const subjectName = item.subject_id?.name || item.subject_name || 'Mata Pelajaran';
                  const timeStr = (item.start_time && item.end_time) ? `${item.start_time} - ${item.end_time}` : `Jam ke-${item.time_slot || idx + 1}`;
                  const roomStr = item.room || `Ruang ${className}`;

                  return (
                    <div 
                      key={item._id || idx}
                      style={{ 
                        background: '#f8fafc', 
                        padding: '12px 14px', 
                        borderRadius: '12px', 
                        borderLeft: '4px solid #0284c7', 
                        borderTop: '1px solid #e2e8f0',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                          {timeStr}
                        </span>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>
                          Kelas {className}
                        </span>
                      </div>
                      <h5 style={{ margin: '2px 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                        {subjectName}
                      </h5>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>meeting_room</span>
                        {roomStr}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buat Kursus / Modul Baru</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul Modul Kursus</label>
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
                  <option value="Informatika">Informatika</option>
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
                <button type="submit" className="btn-save">Buat Modul</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruCourses;