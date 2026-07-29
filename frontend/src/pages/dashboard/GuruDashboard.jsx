import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/dashboard/guru/guru-modul.css';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const getCurrentDayName = () => {
  const dayIdx = new Date().getDay();
  const dayMap = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' };
  return dayMap[dayIdx] || 'SENIN';
};

const GuruDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeClasses, setActiveClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allDbSchedules, setAllDbSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [homeroomStatus, setHomeroomStatus] = useState(null);

  // Dropdown states for each schedule card
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchTeacherDashboardData();
    checkHomeroomStatus();
  }, []);

  const checkHomeroomStatus = async () => {
    try {
      const res = await api.get('/guru/homeroom-status');
      if (res.data.success && res.data.is_homeroom) {
        setHomeroomStatus(res.data.homeroom_class);
      }
    } catch (e) {
      console.error('Error checking homeroom status:', e);
    }
  };

  const fetchTeacherDashboardData = async () => {
    try {
      setLoading(true);

      const [profileRes, studentsRes, schedulesRes, assignmentsRes, dbSchedRes] = await Promise.allSettled([
        api.get('/profile'),
        api.get('/users/students/all'),
        api.get('/attendance/guru/schedules'),
        api.get('/assignments/guru/me'),
        api.get('/schedules')
      ]);

      const profileData = profileRes.status === 'fulfilled' ? (profileRes.value.data || {}) : {};
      setProfile(profileData);

      const allStudents = studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.data || []) : [];
      setTotalStudentsCount(allStudents.length);

      const mappedClasses = (profileData.classes || []).map(c => {
        const studentCount = allStudents.filter(s => s.class_id === c._id || s.class_id?._id === c._id).length;
        return {
          id: c._id,
          name: c.name,
          students: studentCount,
          room: 'Ruang Kelas ' + c.name
        };
      });
      setActiveClasses(mappedClasses);

      const fetchedSchedules = schedulesRes.status === 'fulfilled' ? (schedulesRes.value.data?.schedules || []) : [];
      setSchedules(fetchedSchedules);

      const fetchedDbSched = dbSchedRes.status === 'fulfilled' ? (dbSchedRes.value.data?.data || []) : [];
      setAllDbSchedules(fetchedDbSched);

      const allAssignments = assignmentsRes.status === 'fulfilled' ? (assignmentsRes.value.data?.data || []) : [];
      setRecentAssignments(allAssignments);

      setLoading(false);
    } catch (err) {
      console.error('Error loading teacher dashboard data', err);
      setLoading(false);
    }
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // Modal States & Course Detail View State
  const [activeCourseDetail, setActiveCourseDetail] = useState(null); // { schedule, activeSessionIdx: 0, activeTab: 'sesi' }
  const [bankMaterialModal, setBankMaterialModal] = useState(null); // { targetSchedule, targetSessionNum: 1 }
  const [bankMaterials, setBankMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [loadingBankMaterials, setLoadingBankMaterials] = useState(false);
  const [publishingMaterial, setPublishingMaterial] = useState(false);

  const [taskModal, setTaskModal] = useState(null);
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Open Bank Material Popup
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

  // Publish / Upload Material from Bank Material directly to Class & Session
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

      alert(`Berhasil mengunggah materi dari Bank Materi langsung ke Sesi ke-${sessionNum} Kelas ${bankMaterialModal.targetSchedule.class_name || ''}!`);
      setBankMaterialModal(null);
      fetchTeacherDashboardData();
    } catch (err) {
      console.error('Error publishing material:', err);
      alert(err.response?.data?.message || 'Gagal mengunggah materi ke sesi kelas.');
    } finally {
      setPublishingMaterial(false);
    }
  };

  // Open Task Popup
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

  const formattedDateString = new Date(selectedDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (loading) {
    return (
      <div className="modul-guru-loading">
        <div className="loading-spinner"></div>
        <p>Memuat Modul Mengajar & Dashboard Guru...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modul-guru-error">
        <h4>Terjadi Kesalahan</h4>
        <p>{error}</p>
      </div>
    );
  }

  // Base schedules
  const baseSchedules = schedules.length > 0 ? schedules : activeClasses.map((c, idx) => ({
    id: c.id || idx,
    class_id: c.id,
    class_name: c.name,
    subject: profile?.subjects && profile.subjects[0] ? profile.subjects[0].name : 'Informatika',
    day: idx % 2 === 0 ? 'RABU' : 'KAMIS',
    start_time: idx === 0 ? '07:30' : '10:00',
    end_time: idx === 0 ? '09:30' : '12:00',
    room: 'Ruang Kelas ' + c.name,
    pertemuan_ke: 9 + idx,
    presensi_count: 11 + idx,
    total_pertemuan: 16
  }));

  // Filter schedules by selected day
  const filteredDbSchedules = allDbSchedules.filter(s => 
    (s.teacher_id === profile?._id || s.teacher_id?._id === profile?._id) &&
    (s.day || '').toUpperCase() === selectedDay.toUpperCase()
  );

  const displaySchedules = filteredDbSchedules.length > 0 
    ? filteredDbSchedules.map((s, idx) => ({
        id: s._id,
        class_id: s.class_id?._id || s.class_id,
        class_name: s.class_id?.name || 'Kelas',
        subject: s.subject_id?.name || 'Informatika',
        day: s.day,
        start_time: s.start_time || '07:30',
        end_time: s.end_time || '09:30',
        room: s.room || ('Ruang Kelas ' + (s.class_id?.name || '')),
        pertemuan_ke: 9 + idx,
        presensi_count: 11 + idx,
        total_pertemuan: 16
      }))
    : baseSchedules;

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

  // RENDER VIEW 2: EDLINK SIAKAD COURSE DETAIL PAGE (MATCHING SCREENSHOT 41 EXACTLY)
  if (activeCourseDetail) {
    const sch = activeCourseDetail.schedule;
    const currentSesiIdx = activeCourseDetail.activeSessionIdx || 0;
    const activeTab = activeCourseDetail.activeTab || 'sesi';

    return (
      <div className="modul-guru-container" style={{ maxWidth: '1400px' }}>
        <button 
          onClick={() => setActiveCourseDetail(null)}
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 16px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span> Kembali ke Daftar Modul Guru
        </button>

        {/* EDLINK COURSE HEADER CARD */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>
                {sch.subject || 'INFORMATIKA'} ({sch.class_name || '8F'})
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Kelas: {sch.class_name || '8F'} | Sistem KBM Reguler
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleOpenBankMaterialModal(sch, currentSesiIdx + 1)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined">library_add</span> + Berkas Media Library / Bank Materi
              </button>
              <button 
                onClick={() => navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}`)}
                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined">edit_calendar</span> Isi Presensi Sesi Ini
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
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{sch.students || 32} Peserta Siswa</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Pengajar Utama:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{profile?.full_name || 'Susi Herlina, S.Kom.'}</strong>
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

        {/* TWO COLUMN COURSE LAYOUT (16 SESSIONS SIDEBAR + MAIN CONTENT AREA) */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          
          {/* LEFT COLUMN: 16 SESSIONS LIST */}
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

          {/* RIGHT COLUMN: ACTIVE SESSION CONTENT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Active Session Info Box */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  Sesi #{currentSesiIdx + 1} <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginLeft: '8px' }}>Sesi Anda</span>
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}`)}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fact_check</span> Isi Presensi
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '2px' }}>Rencana Materi:</label>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{topics[currentSesiIdx]}</p>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '2px' }}>Realisasi Materi:</label>
                <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>Penjelasan modul dan evaluasi KBM pertemuan ke-{currentSesiIdx + 1}.</p>
              </div>
            </div>

            {/* MATERI SESI BOX (Direct Upload / Bank Materi) */}
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

            {/* AKTIVITAS & TUGAS SESI BOX */}
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

  // RENDER VIEW 1: DASHBOARD GURU MODUL CARDS LIST
  return (
    <div className="modul-guru-container">
      
      {/* HEADER SECTION: Title & Date Selector */}
      <div className="modul-guru-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="modul-title">Jadwal Mengajar Guru (KBM)</h1>
          <p className="modul-subtitle">
            Sesi KBM & aktivitas mengajar untuk hari <strong>{selectedDay}</strong> ({displaySchedules.length} Sesi Kelas).
          </p>
        </div>

        <div className="modul-date-picker-box">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="date-text">{formattedDateString}</span>
        </div>
      </div>

      {/* DAY FILTER TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              border: 'none',
              background: selectedDay === day ? '#0284c7' : '#ffffff',
              color: selectedDay === day ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: selectedDay === day ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {day === getCurrentDayName() && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedDay === day ? '#ffffff' : '#16a34a' }}></span>
            )}
            {day}
          </button>
        ))}
      </div>

      {/* MAIN TWO-COLUMN LAYOUT (EdLink / SIAKAD Portal Style) */}
      <div className="modul-guru-grid-layout">
        
        {/* LEFT COLUMN: Main Teaching Class Cards */}
        <div className="modul-main-column">
          
          {/* Status Banner */}
          <div className="status-session-banner">
            <span className="material-symbols-outlined icon-live">sensors</span>
            <span>Sesi KBM & Jam Pelajaran Hari Ini Berlangsung Aktif</span>
          </div>

          {/* LIST OF CLASS TEACHING CARDS */}
          <div className="schedules-card-list">
            {displaySchedules.map((sch, index) => {
              const schId = sch.id || index;
              const meetingNum = sch.pertemuan_ke || (7 + index);
              const presensiNum = sch.presensi_count || (10 + index);
              const totalMeeting = sch.total_pertemuan || 16;

              return (
                <div 
                  key={schId} 
                  className="teaching-card"
                  style={{ transition: 'all 0.2s ease' }}
                >
                  
                  {/* Card Header: Subject & Room/SKS Badge (CLICKABLE TO OPEN COURSE DETAIL) */}
                  <div 
                    className="card-top-header"
                    onClick={() => setActiveCourseDetail({ schedule: sch, activeSessionIdx: 0, activeTab: 'sesi' })}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk membuka Halaman Detail Modul Kelas SIAKAD EdLink"
                  >
                    <div className="card-subject-info">
                      <h3>
                        {sch.subject || 'Mata Pelajaran'} ({sch.class_name || 'Kelas'})
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '800', marginLeft: '8px', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span> Lihat Detail Modul
                        </span>
                      </h3>
                      <span className="badge-status Selesai">Selesai / Aktif</span>
                    </div>
                    <div className="sks-badge">
                      <span className="material-symbols-outlined">bookmark</span>
                      2 Jam Pelajaran (JP)
                    </div>
                  </div>

                  {/* Grid Info Grid (Time, Room, Meeting, Attendance) */}
                  <div 
                    className="card-info-grid"
                    onClick={() => setActiveCourseDetail({ schedule: sch, activeSessionIdx: 0, activeTab: 'sesi' })}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="info-cell">
                      <span className="material-symbols-outlined info-icon">schedule</span>
                      <div>
                        <span className="cell-label">Waktu</span>
                        <p className="cell-value">{sch.start_time || '07:30'} - {sch.end_time || '09:30'} WIB</p>
                      </div>
                    </div>

                    <div className="info-cell">
                      <span className="material-symbols-outlined info-icon">meeting_room</span>
                      <div>
                        <span className="cell-label">Ruangan</span>
                        <p className="cell-value">{sch.room || ('Ruang Kelas ' + sch.class_name)}</p>
                      </div>
                    </div>

                    <div className="info-cell">
                      <span className="material-symbols-outlined info-icon">auto_stories</span>
                      <div>
                        <span className="cell-label">Pertemuan ke - {meetingNum}</span>
                        <p className="cell-value">Overview & Materi Bab {meetingNum - 6}</p>
                      </div>
                    </div>

                    <div className="info-cell">
                      <span className="material-symbols-outlined info-icon check">check_circle</span>
                      <div>
                        <span className="cell-label">Presensi Guru</span>
                        <p className="cell-value">{presensiNum} dari {totalMeeting} Pertemuan</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons Bar (DIRECT ACTION POPUPS) */}
                  <div className="card-action-bar">
                    <button
                      className="btn-action-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}`);
                      }}
                    >
                      <span className="material-symbols-outlined">edit_calendar</span>
                      Perbaharui Presensi
                    </button>

                    <button
                      className="btn-action-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBankMaterialModal(sch, meetingNum);
                      }}
                    >
                      <span className="material-symbols-outlined">menu_book</span>
                      Kelas / Modul Materi
                    </button>

                    <button
                      className="btn-action-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTaskModal(sch, meetingNum);
                      }}
                    >
                      <span className="material-symbols-outlined">assignment</span>
                      Tugas Kelas
                    </button>

                    {/* Dropdown for Other Options */}
                    <div className="dropdown-action-wrapper">
                      <button
                        className="btn-action-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(schId);
                        }}
                      >
                        Opsi Lainnya
                        <span className="material-symbols-outlined">expand_more</span>
                      </button>

                      {openDropdownId === schId && (
                        <div className="dropdown-options-menu">
                          <button onClick={() => setActiveCourseDetail({ schedule: sch, activeSessionIdx: 0, activeTab: 'sesi' })}>
                            <span className="material-symbols-outlined">school</span> Detail Modul SIAKAD Kelas
                          </button>
                          <button onClick={() => navigate('/dashboard/guru/input-nilai')}>
                            <span className="material-symbols-outlined">edit_note</span> Input Nilai Ujian
                          </button>
                          <button onClick={() => navigate('/dashboard/guru/leger')}>
                            <span className="material-symbols-outlined">table_view</span> Leger Nilai Kelas
                          </button>
                          <button onClick={() => navigate('/dashboard/guru/quiz')}>
                            <span className="material-symbols-outlined">emoji_objects</span> Quiz Live
                          </button>
                          <button onClick={() => navigate('/dashboard/guru/cbt')}>
                            <span className="material-symbols-outlined">quiz</span> Ujian CBT
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Teacher Profile Summary Panel */}
        <div className="modul-side-column">
          <div className="teacher-profile-summary-card">
            <div className="profile-top-row">
              <div className="teacher-avatar">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div className="teacher-name-info">
                <h4>Hai, {profile?.full_name || 'Susi Herlina, S.Kom.'}</h4>
                <p>Beban mengajar: <strong>{activeClasses.length * 6} Jam Pelajaran (JP)</strong></p>
              </div>
            </div>

            <div className="teacher-stats-flex">
              <div className="stat-box">
                <span className="stat-num">{totalStudentsCount || 32}</span>
                <span className="stat-lbl">Siswa Binaan</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-box">
                <span className="stat-num">{activeClasses.length || 4}</span>
                <span className="stat-lbl">Kelas Mengajar</span>
              </div>
            </div>

            {homeroomStatus && (
              <div className="homeroom-pill-banner" onClick={() => navigate('/dashboard/guru/walikelas')}>
                <span className="material-symbols-outlined">shield_person</span>
                <span>Wali Kelas {homeroomStatus.name}</span>
                <span className="material-symbols-outlined arrow">chevron_right</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* POPUP 1: MODAL PILIH MATERI DARI BANK MATERI (DIRECT UPLOAD KE KELAS & SESI MODUL) */}
      {bankMaterialModal && (
        <div className="modal-backdrop" onClick={() => setBankMaterialModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '20px' }}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>library_books</span>
                Pilih Materi dari Bank Materi untuk Kelas {bankMaterialModal.targetSchedule.class_name}
              </h3>
              <button className="btn-close-modal" onClick={() => setBankMaterialModal(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Bank Materi adalah tempat membuat & menyimpan draf materi. Pilih materi yang telah Anda buat di Bank Materi untuk diunggah langsung ke <strong>Kelas {bankMaterialModal.targetSchedule.class_name} (Sesi Pertemuan ke-{bankMaterialModal.targetSessionNum || 1})</strong>.
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{mat.title}</strong>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: mat.source_type === 'ai' ? '#f0fdf4' : '#eff6ff', color: mat.source_type === 'ai' ? '#166534' : '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>
                            {mat.source_type === 'ai' ? '🤖 Generasi AI' : '✍️ Manual'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {mat.description || 'Tanpa deskripsi'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  Belum ada materi di Bank Materi. Buat materi terlebih dahulu di menu <strong>Materi</strong>.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-cancel" onClick={() => setBankMaterialModal(null)}>Batal</button>
              <button
                className="btn-submit"
                onClick={handlePublishMaterialToClassSession}
                disabled={publishingMaterial || !selectedMaterialId}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                {publishingMaterial ? 'Mengunggah...' : 'Upload Direct ke Sesi Modul Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: MODAL PILIH TUGAS KELAS */}
      {taskModal && (
        <div className="modal-backdrop" onClick={() => setTaskModal(null)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: '20px' }}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>assignment</span>
                Pilih / Kelola Tugas Kelas {taskModal.targetSchedule.class_name}
              </h3>
              <button className="btn-close-modal" onClick={() => setTaskModal(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Sematkan tugas kelas untuk <strong>Kelas {taskModal.targetSchedule.class_name} (Sesi ke-{taskModal.targetSessionNum || 1})</strong>.
              </p>

              {loadingTasks ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat daftar tugas...</div>
              ) : teacherTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                  {teacherTasks.map((t) => (
                    <label
                      key={t._id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: selectedTaskId === t._id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: selectedTaskId === t._id ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="selectedTeacherTask"
                        value={t._id}
                        checked={selectedTaskId === t._id}
                        onChange={() => setSelectedTaskId(t._id)}
                        style={{ marginTop: '4px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{t.title}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Tenggat: {new Date(t.due_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  Belum ada tugas yang dibuat.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  setTaskModal(null);
                  navigate('/dashboard/guru/assignments');
                }}
              >
                <span className="material-symbols-outlined">add</span> Buat Tugas Baru
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-cancel" onClick={() => setTaskModal(null)}>Batal</button>
                <button
                  className="btn-submit"
                  onClick={() => {
                    alert(`Tugas berhasil disematkan ke Kelas ${taskModal.targetSchedule.class_name}!`);
                    setTaskModal(null);
                  }}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Sematkan ke Sesi Kelas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuruDashboard;