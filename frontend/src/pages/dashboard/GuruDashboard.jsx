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
  const [error] = useState('');

  const [activeClasses, setActiveClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allDbSchedules, setAllDbSchedules] = useState([]);
  const [selectedDay] = useState(getCurrentDayName());
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [homeroomStatus, setHomeroomStatus] = useState(null);

  const [selectedDate] = useState(() => {
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
        api.get('/attendance/schedules'),
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
        <p>Memuat Dashboard Utama Guru...</p>
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

  const baseSchedules = schedules.length > 0 ? schedules : activeClasses.map((c, idx) => ({
    id: c.id || idx,
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

  const filteredDbSchedules = allDbSchedules.filter(s => 
    (s.teacher_id === profile?._id || s.teacher_id?._id === profile?._id) &&
    (s.day || '').toUpperCase() === selectedDay.toUpperCase()
  );

  const displaySchedules = filteredDbSchedules.length > 0 
    ? filteredDbSchedules.map((s, idx) => ({
        id: s._id,
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

  return (
    <div className="modul-guru-container" style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto' }}>
      
      {/* WELCOME BANNER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '20px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{ fontSize: '12px', textTransform: 'uppercase', tracking: '1px', fontWeight: '800', opacity: 0.9, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>
            Dashboard Guru Mapel & KBM
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '10px 0 6px 0', color: '#ffffff' }}>
            Selamat Datang, {profile?.full_name || 'Susi Herlina, S.Kom.'}!
          </h2>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
            SMP Negeri 1 Suradadi | Semester Genap T.A. 2025/2026
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/guru/courses')}
          style={{
            background: '#ffffff',
            color: '#0284c7',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '14px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">school</span>
          Buka Modul Guru (KBM)
        </button>
      </div>

      {/* SUMMARY STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>group</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block' }}>Total Siswa Binaan</span>
            <strong style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{totalStudentsCount || 32} Siswa</strong>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>meeting_room</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block' }}>Kelas Mengajar</span>
            <strong style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{activeClasses.length || 4} Kelas</strong>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>schedule</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block' }}>Beban Mengajar</span>
            <strong style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{activeClasses.length * 6} JP / Mggu</strong>
          </div>
        </div>

        <div 
          onClick={() => homeroomStatus && navigate('/dashboard/guru/walikelas')}
          style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px', cursor: homeroomStatus ? 'pointer' : 'default' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fae8ff', color: '#a21caf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>shield_person</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block' }}>Status Wali Kelas</span>
            <strong style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              {homeroomStatus ? `Wali Kelas ${homeroomStatus.name}` : 'Guru Mapel'}
            </strong>
          </div>
        </div>

      </div>

      {/* QUICK MENU SHORTCUTS */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>apps</span>
          Pintasan Menu Utama Guru
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          
          <button
            onClick={() => navigate('/dashboard/guru/courses')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">school</span> Modul Guru (KBM)
          </button>

          <button
            onClick={() => navigate('/dashboard/guru/materials')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">card_membership</span> Bank Materi
          </button>

          <button
            onClick={() => navigate('/dashboard/guru/assignments')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">assignment</span> Tugas Kelas
          </button>

          <button
            onClick={() => navigate('/dashboard/guru/attendance')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">event_available</span> Presensi Siswa
          </button>

          <button
            onClick={() => navigate('/dashboard/guru/input-nilai')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">edit_note</span> Input Nilai Ujian
          </button>

          <button
            onClick={() => navigate('/dashboard/guru/cbt')}
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span className="material-symbols-outlined">quiz</span> Ujian CBT
          </button>

        </div>
      </div>

      {/* TODAY'S SCHEDULE SUMMARY & RECENT ACTIVITIES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        
        {/* LEFT COLUMN: TODAY SCHEDULE SUMMARY */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>today</span>
                Ringkasan Jadwal Mengajar Hari Ini ({selectedDay})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{formattedDateString}</span>
            </div>
            <button
              onClick={() => navigate('/dashboard/guru/courses')}
              style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
            >
              Lihat Semua Modul KBM ➔
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displaySchedules.slice(0, 3).map((sch, idx) => (
              <div 
                key={sch.id || idx}
                onClick={() => navigate('/dashboard/guru/courses')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                    {sch.subject} ({sch.class_name})
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>schedule</span> {sch.start_time} - {sch.end_time} WIB</span>
                    <span><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>meeting_room</span> {sch.room}</span>
                  </span>
                </div>

                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                  Aktif
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ASSIGNMENTS / ANNOUNCEMENT SUMMARY */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>assignment_late</span>
            Tugas Terbaru Dibuat
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentAssignments.length > 0 ? (
              recentAssignments.slice(0, 4).map(asg => (
                <div key={asg._id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{asg.title}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Tenggat: {new Date(asg.due_date).toLocaleDateString('id-ID')}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}>
                Belum ada tugas terbaru.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default GuruDashboard;