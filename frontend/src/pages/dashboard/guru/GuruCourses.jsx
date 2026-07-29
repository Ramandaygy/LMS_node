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

  const [activeCourseDetail, setActiveCourseDetail] = useState(null);
  const [bankMaterialModal, setBankMaterialModal] = useState(null);
  const [bankMaterials, setBankMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [loadingBankMaterials, setLoadingBankMaterials] = useState(false);
  const [publishingMaterial, setPublishingMaterial] = useState(false);

  const [taskModal, setTaskModal] = useState(null);
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);

  const handleOpenBankMaterialModal = async (sch, sessionNum = 1) => {
    setBankMaterialModal({ targetSchedule: sch, targetSessionNum: sessionNum });
    setLoadingBankMaterials(true);
    try {
      const res = await api.get('/materials/guru/me');
      const items = res.data.data || res.data.materials || [];
      setBankMaterials(items);
      if (items.length > 0) setSelectedMaterialId(items[0]._id);
    } catch (err) {
      console.error('Error fetching bank materials:', err);
    } finally {
      setLoadingBankMaterials(false);
    }
  };

  const handlePublishMaterialToClassSession = async () => {
    if (!selectedMaterialId || !bankMaterialModal) return;
    setPublishingMaterial(true);
    try {
      const targetClassId = bankMaterialModal.targetSchedule.class_id?._id || bankMaterialModal.targetSchedule.class_id || bankMaterialModal.targetSchedule.id;
      const sessionNum = bankMaterialModal.targetSessionNum || 1;

      await api.post('/materials/distribute-batch', {
        material_ids: [selectedMaterialId],
        class_id: targetClassId,
        session_number: sessionNum
      });

      alert(`Berhasil mengunggah materi dari Bank Materi langsung ke Sesi ke-${sessionNum} Kelas!`);
      setBankMaterialModal(null);
      loadPageData();
    } catch (err) {
      console.error('Error publishing material:', err);
      alert(err.response?.data?.message || 'Gagal mengunggah materi ke sesi kelas.');
    } finally {
      setPublishingMaterial(false);
    }
  };

  const handleOpenTaskModal = async (sch, sessionNum = 1) => {
    setTaskModal({ targetSchedule: sch, targetSessionNum: sessionNum });
    setLoadingTasks(true);
    try {
      const res = await api.get('/assignments/guru/me');
      const items = res.data.data || [];
      setTeacherTasks(items);
      if (items.length > 0) setSelectedTaskId(items[0]._id);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  if (loading) return <div className="loading" style={{ padding: '30px', textAlign: 'center' }}>Memuat Modul Guru & Jadwal...</div>;

  const currentDayName = getCurrentDayName();
  const filteredSchedules = schedules.filter(s => (s.day || '').toUpperCase() === selectedDay.toUpperCase());

  const topics = [
    "Pengenalan Konsep Dasar KBM & Silabus Kurikulum",
    "Pemahaman Tipe Data, Karakteristik Himpunan & Algoritma",
    "Struktur Pembelajaran: Data Preprocessing & Cleaning",
    "Analisis Sistem: Data Preprocessing & Transformation",
    "Metode Klasifikasi: K-Nearest Neighbors (KNN)",
    "Metode Klasifikasi: Naive Bayes Classifier",
    "Evaluasi & Overview Persiapan Ujian Tengah Semester (UTS)",
    "Ujian Tengah Semester (UTS) Teori & Praktikum",
    "Review Hasil UTS & Pendalaman Materi Lanjutan Bab 4",
    "Penerapan Konsep AI & Machine Learning Dasar",
    "Analisis Data Visual & Manajemen Database LMS",
    "Algoritma Pengelompokan (Clustering) & K-Means",
    "Etika Digital, Keamanan Data & Hak Cipta Perangkat Lunak",
    "Penyusunan Proyek Mandiri & Penugasan Kelompok",
    "Presentasi & Demonstrasi Proyek Akhir Pembelajaran",
    "Ujian Akhir Semester (UAS) & Evaluasi Rekapitulasi Rapor"
  ];

  // RENDER EDLINK SIAKAD COURSE DETAIL VIEW (SCREENSHOT 41)
  if (activeCourseDetail) {
    const sch = activeCourseDetail.schedule;
    const currentSesiIdx = activeCourseDetail.activeSessionIdx || 0;
    const activeTab = activeCourseDetail.activeTab || 'sesi';

    return (
      <div className="guru-dashboard-content" style={{ padding: '24px', maxWidth: '1400px' }}>
        <button 
          onClick={() => setActiveCourseDetail(null)}
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 16px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span> Kembali ke Daftar Modul Guru
        </button>

        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>
                {sch.title || sch.subject_name || sch.name || 'MOBILE DEVELOPMENT'} ({sch.class_name || 'RPL4'})
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Kelas: {sch.class_name || 'RPL4'} | Sistem KBM Reguler
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleOpenBankMaterialModal(sch, currentSesiIdx + 1)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined">library_add</span> + Berkas Media Library / Bank Materi
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Sekolah:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>SMP Negeri 1 Suradadi</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Periode Akademik:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>2025/2026 Genap</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Peserta Kelas:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{sch.total_students || 32} Peserta Siswa</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Pengajar Utama:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{teacherProfile?.full_name || 'Susi Herlina, S.Kom.'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', overflowX: 'auto' }}>
            {['Sesi', 'Asesmen / Tugas', 'Timeline', 'Peserta Siswa', 'Laporan Nilai', 'Info Kelas'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveCourseDetail({ ...activeCourseDetail, activeTab: tab.toLowerCase() })}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeTab === tab.toLowerCase() ? '3px solid #0284c7' : '3px solid transparent',
                  background: 'transparent',
                  color: activeTab === tab.toLowerCase() ? '#0284c7' : '#64748b',
                  fontWeight: activeTab === tab.toLowerCase() ? '800' : '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '16px', maxHeight: '720px', overflowY: 'auto' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#334155', margin: '0 0 12px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Terdapat 16 Sesi KBM
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 16 }, (_, i) => {
                const sessNum = i + 1;
                const isActive = currentSesiIdx === i;
                const topicTitle = topics[i] || `Pembahasan Materi Sesi ke-${sessNum}`;
                const isPast = sessNum <= 11;

                return (
                  <div
                    key={sessNum}
                    onClick={() => setActiveCourseDetail({ ...activeCourseDetail, activeSessionIdx: i })}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isActive ? '#f0f9ff' : (isPast ? '#f8fafc' : '#ffffff'),
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '12px', color: isActive ? '#0284c7' : '#1e293b' }}>
                        #{sessNum}. {topicTitle}
                      </strong>
                      {isPast && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>check_circle</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                      Sesi KBM Pertemuan ke-{sessNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 14px 0' }}>
                Sesi #{currentSesiIdx + 1} <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginLeft: '8px' }}>Sesi Anda</span>
              </h3>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '2px' }}>Rencana Materi:</label>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{topics[currentSesiIdx]}</p>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '2px' }}>Realisasi Materi:</label>
                <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>Penjelasan modul dan evaluasi KBM pertemuan ke-{currentSesiIdx + 1}.</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>folder</span>
                  Materi Sesi ke-{currentSesiIdx + 1}
                </strong>
                <button
                  onClick={() => handleOpenBankMaterialModal(sch, currentSesiIdx + 1)}
                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> Berkas Media Library / Bank Materi
                </button>
              </div>

              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>cloud_upload</span>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Gunakan tombol <strong>+ Berkas Media Library / Bank Materi</strong> di atas untuk mengunggah atau memilih materi dari Bank Materi secara langsung.
                </p>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>assignment</span>
                  Aktivitas & Tugas Sesi ke-{currentSesiIdx + 1}
                </strong>
                <button
                  onClick={() => handleOpenTaskModal(sch, currentSesiIdx + 1)}
                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> + Aktivitas / Tugas Sesi
                </button>
              </div>

              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>task</span>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Belum ada aktivitas atau tugas khusus yang disematkan pada sesi ini.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

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
                <div 
                  key={course._id} 
                  className="course-card" 
                  onClick={() => setActiveCourseDetail({ schedule: course, activeSessionIdx: 0, activeTab: 'sesi' })}
                  style={{ background: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer' }}
                >
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
                    <button className="btn-view" style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Lihat Detail Modul SIAKAD</button>
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
                      onClick={() => setActiveCourseDetail({ schedule: item, activeSessionIdx: 0, activeTab: 'sesi' })}
                      style={{ 
                        background: '#f8fafc', 
                        padding: '12px 14px', 
                        borderRadius: '12px', 
                        borderLeft: '4px solid #0284c7', 
                        borderTop: '1px solid #e2e8f0',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer'
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

      {/* POPUP 1: MODAL PILIH MATERI DARI BANK MATERI */}
      {bankMaterialModal && (
        <div className="modal-overlay" onClick={() => setBankMaterialModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Pilih Materi dari Bank Materi
              </h3>
              <button onClick={() => setBankMaterialModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Pilih materi dari Bank Materi Anda untuk diunggah langsung ke sesi kelas ini.
              </p>

              {loadingBankMaterials ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat koleksi Bank Materi...</div>
              ) : bankMaterials.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                  {bankMaterials.map((mat) => (
                    <label
                      key={mat._id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: selectedMaterialId === mat._id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: selectedMaterialId === mat._id ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="selectedBankMaterial"
                        value={mat._id}
                        checked={selectedMaterialId === mat._id}
                        onChange={() => setSelectedMaterialId(mat._id)}
                        style={{ marginTop: '4px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{mat.title}</strong>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>{mat.description || 'Tanpa deskripsi'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  Belum ada materi di Bank Materi.
                </div>
              )}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-cancel" onClick={() => setBankMaterialModal(null)} style={{ padding: '8px 16px', borderRadius: '8px' }}>Batal</button>
              <button
                onClick={handlePublishMaterialToClassSession}
                disabled={publishingMaterial || !selectedMaterialId}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                {publishingMaterial ? 'Mengunggah...' : 'Upload Direct ke Sesi Modul Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buat Modul Guru Baru</h3>
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