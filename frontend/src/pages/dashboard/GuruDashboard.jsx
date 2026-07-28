import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/dashboard/guru/guru-modul.css';

const GuruDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeClasses, setActiveClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
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

      const [profileRes, studentsRes, schedulesRes, assignmentsRes] = await Promise.all([
        api.get('/profile'),
        api.get('/users/students/all'),
        api.get('/attendance/guru/schedules'),
        api.get('/assignments/guru/me')
      ]);

      const profileData = profileRes.data || {};
      setProfile(profileData);

      const allStudents = studentsRes.data?.data || [];
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

      const fetchedSchedules = schedulesRes.data?.schedules || [];
      setSchedules(fetchedSchedules);

      const allAssignments = assignmentsRes.data?.data || [];
      setRecentAssignments(allAssignments);

      setLoading(false);
    } catch (err) {
      console.error('Error loading teacher dashboard data', err);
      setError('Gagal memuat data Modul Guru.');
      setLoading(false);
    }
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
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

  // Generate interactive class schedules display matching SIAKAD / EdLink reference
  const teachingSchedules = schedules.length > 0 ? schedules : activeClasses.map((c, idx) => ({
    id: c.id || idx,
    class_name: c.name,
    subject: profile?.subjects && profile.subjects[0] ? profile.subjects[0].name : 'Informatika',
    day: 'Hari Ini',
    start_time: idx === 0 ? '07:30' : '10:00',
    end_time: idx === 0 ? '09:30' : '12:00',
    room: 'Ruang Kelas ' + c.name,
    pertemuan_ke: 9 + idx,
    presensi_count: 11 + idx,
    total_pertemuan: 16
  }));

  return (
    <div className="modul-guru-container">
      
      {/* HEADER SECTION: Title & Date Selector */}
      <div className="modul-guru-top-bar">
        <div>
          <h1 className="modul-title">Jadwal Mengajar Hari Ini</h1>
          <p className="modul-subtitle">Anda memiliki {teachingSchedules.length} aktivitas mengajar pada sesi KBM hari ini.</p>
        </div>

        <div className="modul-date-picker-box">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="date-text">{formattedDateString}</span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT (EdLink / SIAKAD Portal Style) */}
      <div className="modul-guru-grid-layout">
        
        {/* LEFT COLUMN: Main Teaching Class Cards */}
        <div className="modul-main-column">
          
          {/* Status Banner */}
          <div className="status-session-banner">
            <span className="material-symbols-outlined icon-live">sensors</span>
            <span>Sesi Perkuliahan & KBM Hari Ini Berlangsung Aktif</span>
          </div>

          {/* LIST OF CLASS TEACHING CARDS */}
          <div className="schedules-card-list">
            {teachingSchedules.map((sch, index) => {
              const schId = sch.id || index;
              const meetingNum = sch.pertemuan_ke || (7 + index);
              const presensiNum = sch.presensi_count || (10 + index);
              const totalMeeting = sch.total_pertemuan || 16;

              return (
                <div key={schId} className="teaching-card">
                  
                  {/* Card Header: Subject & Room/SKS Badge */}
                  <div className="card-top-header">
                    <div className="card-subject-info">
                      <h3>{sch.subject || 'Mata Pelajaran'} ({sch.class_name || 'Kelas'})</h3>
                      <span className="badge-status Selesai">Selesai / Aktif</span>
                    </div>
                    <div className="sks-badge">
                      <span className="material-symbols-outlined">bookmark</span>
                      2 Jam KBM
                    </div>
                  </div>

                  {/* Grid Info Grid (Time, Room, Meeting, Attendance) */}
                  <div className="card-info-grid">
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

                  {/* Connected Session Components Strip (1 Sesi KBM Terhubung) */}
                  <div className="connected-session-strip">
                    <span className="strip-title">Komponen Terhubung 1 Sesi KBM (Pertemuan ke-{meetingNum}):</span>
                    <div className="strip-items-grid">
                      <div className="strip-item" onClick={() => navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}`)}>
                        <span className="material-symbols-outlined icon amber">fact_check</span>
                        <span>1. Presensi</span>
                      </div>
                      <div className="strip-item" onClick={() => navigate('/dashboard/guru/materials')}>
                        <span className="material-symbols-outlined icon blue">menu_book</span>
                        <span>2. Materi & Modul</span>
                      </div>
                      <div className="strip-item" onClick={() => navigate('/dashboard/guru/assignments')}>
                        <span className="material-symbols-outlined icon green">assignment</span>
                        <span>3. Tugas Kelas</span>
                      </div>
                      <div className="strip-item" onClick={() => navigate('/dashboard/guru/materials')}>
                        <span className="material-symbols-outlined icon purple">forum</span>
                        <span>4. Forum Diskusi</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons Bar matching screenshot reference */}
                  <div className="card-action-bar">
                    <button
                      className="btn-action-primary"
                      onClick={() => navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}`)}
                    >
                      <span className="material-symbols-outlined">edit_calendar</span>
                      Perbaharui Presensi
                    </button>

                    <button
                      className="btn-action-secondary"
                      onClick={() => navigate('/dashboard/guru/materials')}
                    >
                      <span className="material-symbols-outlined">menu_book</span>
                      Kelas / Modul Materi
                    </button>

                    <button
                      className="btn-action-outline"
                      onClick={() => navigate('/dashboard/guru/assignments')}
                    >
                      <span className="material-symbols-outlined">assignment</span>
                      Tugas Kelas
                    </button>

                    {/* Dropdown for Other Options */}
                    <div className="dropdown-action-wrapper">
                      <button
                        className="btn-action-outline"
                        onClick={() => toggleDropdown(schId)}
                      >
                        Opsi Lainnya
                        <span className="material-symbols-outlined">expand_more</span>
                      </button>

                      {openDropdownId === schId && (
                        <div className="dropdown-options-menu">
                          <button onClick={() => navigate('/dashboard/guru/input-nilai')}>
                            <span className="material-symbols-outlined">edit_note</span> Input Nilai Ujian
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

        {/* RIGHT COLUMN: Tanggungan Guru / Action Required Panel */}
        <div className="modul-side-column">
          
          {/* Teacher Profile Overview Banner Card */}
          <div className="teacher-profile-summary-card">
            <div className="profile-top-row">
              <div className="teacher-avatar">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div className="teacher-name-info">
                <h4>Hai, {profile?.full_name || 'Susi Herlina, S.Kom.'}</h4>
                <p>Beban mengajar: <strong>{activeClasses.length * 6}.00 SKS / Jam KBM</strong></p>
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

          {/* Tanggungan Dosen / Guru Section */}
          <div className="tanggungan-section-card">
            <h3 className="tanggungan-title">
              <span className="material-symbols-outlined">assignment_late</span>
              Tanggungan Guru & Verifikasi
            </h3>

            {/* Item 1: Realisasi Perkuliahan / Materi */}
            <div className="tanggungan-item red">
              <div className="tanggungan-item-header">
                <div className="item-title-group">
                  <span className="material-symbols-outlined icon">analytics</span>
                  <strong>Realisasi Pembelajaran & Modul</strong>
                </div>
                <button className="btn-detail-small" onClick={() => navigate('/dashboard/guru/materials')}>
                  Lihat Detail
                </button>
              </div>
              <p className="tanggungan-desc">
                Terdapat kelas mengajar yang belum Anda isi jurnal modul/materi perkuliahan minggu ini.
              </p>
            </div>

            {/* Item 2: Presensi Siswa */}
            <div className="tanggungan-item amber">
              <div className="tanggungan-item-header">
                <div className="item-title-group">
                  <span className="material-symbols-outlined icon">fact_check</span>
                  <strong>Presensi Siswa Sekelas</strong>
                </div>
                <button className="btn-detail-small" onClick={() => navigate('/dashboard/guru/attendance')}>
                  Lihat Detail
                </button>
              </div>
              <p className="tanggungan-desc">
                Terdapat pertemuan kelas hari ini yang belum diverifikasi presensinya.
              </p>
            </div>

            {/* Item 3: Penilaian Mahasiswa / Siswa */}
            <div className="tanggungan-item blue">
              <div className="tanggungan-item-header">
                <div className="item-title-group">
                  <span className="material-symbols-outlined icon">edit_note</span>
                  <strong>Penilaian & Input Nilai</strong>
                </div>
                <button className="btn-detail-small" onClick={() => navigate('/dashboard/guru/input-nilai')}>
                  Lihat Detail
                </button>
              </div>
              <p className="tanggungan-desc">
                Masih ada penilaian tugas ({recentAssignments.length} tugas) yang belum dikunci nilainya.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GuruDashboard;