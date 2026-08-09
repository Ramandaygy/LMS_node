import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-attendance.css';

const GuruAttendance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedScheduleInfo, setSelectedScheduleInfo] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [activeViewMode, setActiveViewMode] = useState('history');
  const [activeSessionNumber, setActiveSessionNumber] = useState(1);

  const teacherProfileName = 'Susi Herlina, S.Kom.';

  // 🔥 State untuk materi hari ini (hanya 1 pertemuan)
  const [todayMaterial, setTodayMaterial] = useState({
    materi: '',
    subMateri: '',
    ruang: ''
  });
  const [editingMaterialModal, setEditingMaterialModal] = useState(null);

  // 🔥 State untuk data absensi yang sudah tersimpan
  const [savedAttendanceData, setSavedAttendanceData] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // 🔥 Ambil data absensi yang sudah tersimpan
  useEffect(() => {
    if (selectedSchedule && selectedClass) {
      fetchSavedAttendance();
    }
  }, [selectedSchedule, selectedClass, activeSessionNumber]);

  const fetchSavedAttendance = async () => {
    if (!selectedSchedule) return;
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/attendance?schedule_id=${selectedSchedule}&session_number=${activeSessionNumber}`);
      const savedData = res.data.attendance || {};
      setSavedAttendanceData(savedData);
    } catch (err) {
      console.error('Error fetching saved attendance:', err);
      setSavedAttendanceData({});
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const modeParam = searchParams.get('mode');
    const sessionParam = searchParams.get('session_number');
    if (modeParam === 'input' || sessionParam) {
      setActiveViewMode('input');
      if (sessionParam) setActiveSessionNumber(parseInt(sessionParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedSchedule && selectedClass) {
      loadData();
      // 🔥 Load materi hari ini setelah data jadwal dimuat
      loadTodayMaterial();
    }
  }, [selectedSchedule, selectedClass, selectedDate, activeSessionNumber]);

  // 🔥 Load materi hari ini (hanya 1 pertemuan yang aktif)
  const loadTodayMaterial = async () => {
    if (!selectedSchedule) return;
    try {
      // Ambil data materi dari API berdasarkan schedule dan session
      const res = await api.get(`/materials/session?schedule_id=${selectedSchedule}&session_number=${activeSessionNumber}`);
      const data = res.data.data || {};
      
      // Jika ada data dari API, gunakan; jika tidak, biarkan kosong (tidak hardcode)
      if (data.materi || data.subMateri || data.ruang) {
        setTodayMaterial({
          materi: data.materi || '',
          subMateri: data.subMateri || '',
          ruang: data.ruang || ''
        });
      } else {
        // Kosongkan jika tidak ada data (tidak pakai hardcode)
        setTodayMaterial({
          materi: '',
          subMateri: '',
          ruang: ''
        });
      }
    } catch (err) {
      console.error('Error loading today material:', err);
      setTodayMaterial({
        materi: '',
        subMateri: '',
        ruang: ''
      });
    }
  };

  // 🔥 Simpan materi hari ini
  const handleSaveTodayMaterial = async () => {
    if (!editingMaterialModal) return;
    setSaving(true);
    try {
      await api.post('/materials/session', {
        schedule_id: selectedSchedule,
        session_number: activeSessionNumber,
        materi: editingMaterialModal.materi,
        subMateri: editingMaterialModal.subMateri,
        ruang: editingMaterialModal.ruang
      });
      
      setTodayMaterial({
        materi: editingMaterialModal.materi,
        subMateri: editingMaterialModal.subMateri,
        ruang: editingMaterialModal.ruang
      });
      
      setEditingMaterialModal(null);
      setSuccess('Materi pertemuan berhasil diperbarui!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving today material:', err);
      setError('Gagal menyimpan materi pertemuan');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const mergeSchedules = (list) => {
    if (!list || list.length === 0) return [];
    const grouped = {};
    list.forEach((sch) => {
      const cId = sch.class_id?._id || sch.class_id || sch.class || '';
      const sId = sch.subject_id?._id || sch.subject_id || sch.subject || '';
      const day = (sch.day || '').toUpperCase().trim();
      const key = `${cId}_${sId}_${day}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          ...sch,
          pertemuan_list: [sch.pertemuan_ke || 1]
        };
      } else {
        const existing = grouped[key];
        if (sch.start_time && sch.start_time < existing.start_time) {
          existing.start_time = sch.start_time;
        }
        if (sch.end_time && sch.end_time > existing.end_time) {
          existing.end_time = sch.end_time;
        }
      }
    });
    return Object.values(grouped);
  };

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/attendance/schedules');
      const rawSchedules = response.data.schedules || [];
      const schedulesData = mergeSchedules(rawSchedules);
      setSchedules(schedulesData);

      const targetScheduleId = searchParams.get('schedule_id');

      if (schedulesData.length > 0) {
        let matched = null;
        if (targetScheduleId) {
          const targetSch = rawSchedules.find(s => (s.id || s._id) === targetScheduleId);
          if (targetSch) {
            const key = `${targetSch.class_id?._id || targetSch.class_id || targetSch.class || ''}_${targetSch.subject_id?._id || targetSch.subject_id || targetSch.subject || ''}_${(targetSch.day || '').toUpperCase().trim()}`;
            matched = schedulesData.find(s => {
              const cId = s.class_id?._id || s.class_id || s.class || '';
              const sId = s.subject_id?._id || s.subject_id || s.subject || '';
              const day = (s.day || '').toUpperCase().trim();
              return `${cId}_${sId}_${day}` === key;
            });
          }
        }

        if (!matched) {
          const indonesianDays = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
          const now = new Date();
          const currentDayName = indonesianDays[now.getDay()];
          matched = schedulesData.find(s => String(s.day).toUpperCase().trim() === currentDayName) || schedulesData[0];
        }

        setSelectedSchedule(matched.id || matched._id);
        setSelectedScheduleInfo(matched);
        setSelectedClass(matched.class_id);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Gagal mengambil data jadwal');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [studentsResponse, attendanceResponse] = await Promise.all([
        api.get(`/attendance/students/${selectedClass}`),
        api.get(`/attendance?schedule_id=${selectedSchedule}&session_number=${activeSessionNumber}&date=${selectedDate}`)
      ]);

      const studentsData = studentsResponse.data.students || [];
      const savedData = attendanceResponse.data.attendance || {};

      setStudents(studentsData);

      const combinedData = {};
      studentsData.forEach(student => {
        const studentId = student._id || student.id;
        const saved = savedData[studentId];
        combinedData[studentId] = {
          status: saved ? saved.status : null,
          note: saved ? (saved.note || '') : ''
        };
      });

      setAttendanceData(combinedData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setError('Gagal memuat data absensi siswa');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const markAllPresent = () => {
    const newData = {};
    students.forEach(student => {
      const studentId = student._id || student.id;
      newData[studentId] = {
        status: 'present',
        note: ''
      };
    });
    setAttendanceData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const attendanceList = Object.entries(attendanceData).map(([studentId, data]) => ({
        student_id: studentId,
        status: data.status,
        note: data.note
      }));
      await api.post('/attendance/save', {
        attendance: attendanceList,
        schedule_id: selectedSchedule,
        class_id: selectedClass,
        date: selectedDate,
        session_number: activeSessionNumber
      });
      setSuccess('Absensi berhasil disimpan!');
      // 🔥 Refresh data absensi yang tersimpan
      await fetchSavedAttendance();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('Gagal menyimpan absensi');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInputForm = (sessionNum) => {
    setActiveSessionNumber(sessionNum);
    setActiveViewMode('input');
  };

  const getFilteredStudents = () => {
    if (activeFilter === 'all') return students;
    return students.filter(s => {
      const studentId = s._id || s.id;
      return attendanceData[studentId]?.status === activeFilter;
    });
  };

  const getSearchFilteredStudents = () => {
    const filtered = getFilteredStudents();
    if (!searchTerm) return filtered;
    return filtered.filter(s => 
      (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nis || '').includes(searchTerm)
    );
  };

  const displayedStudents = getSearchFilteredStudents();
  const presentCount = Object.values(attendanceData).filter(a => a.status === 'present').length;
  const sickCount = Object.values(attendanceData).filter(a => a.status === 'sick').length;
  const permCount = Object.values(attendanceData).filter(a => a.status === 'permit').length;
  const absentCount = Object.values(attendanceData).filter(a => a.status === 'absent').length;

  const totalStudents = students.length || 32;
  const presentPct = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : '0';
  const sickPct = totalStudents > 0 ? ((sickCount / totalStudents) * 100).toFixed(1) : '0';
  const permPct = totalStudents > 0 ? ((permCount / totalStudents) * 100).toFixed(1) : '0';
  const absentPct = totalStudents > 0 ? ((absentCount / totalStudents) * 100).toFixed(1) : '0';

  if (loading) {
    return <div className="attendance-loading">Memuat data Presensi Kelas & Sesi KBM Pembelajaran...</div>;
  }

  return (
    <div className="siakad-attendance-container">
      
      {/* ============================================================
          HEADER BAR
          ============================================================ */}
      <div className="siakad-top-header">
        <div>
          <h1 className="siakad-page-title">Presensi & Pertemuan KBM Kelas</h1>
          <p className="siakad-page-subtitle">Riwayat Presensi Pertemuan</p>
        </div>

        <div className="siakad-header-right-actions">
            <button className="btn-siakad-back" onClick={() => setActiveViewMode('history')}>
              <span className="material-symbols-outlined">arrow_back</span>
              Kembali ke Riwayat Presensi
            </button>
      
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* ============================================================
           DROPDOWN JADWAL PRESENSI - DI ATAS (SEBELUM META INFO)
          ============================================================ */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        padding: '16px 20px', 
        border: '1px solid #cbd5e1', 
        marginBottom: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>
            Pilih Kelas / Jadwal:
          </label>
          <select
            value={selectedSchedule}
            onChange={(e) => {
              const targetId = e.target.value;
              const targetSch = schedules.find(s => (s.id || s._id) === targetId);
              if (targetSch) {
                setSelectedSchedule(targetId);
                setSelectedScheduleInfo(targetSch);
                setSelectedClass(targetSch.class_id);
              }
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              minWidth: '200px'
            }}
          >
            {schedules.map((s) => (
              <option key={s.id || s._id} value={s.id || s._id}>
                {s.class_name} - {s.subject} ({s.day}, {s.start_time}-{s.end_time})
              </option>
            ))}
          </select>

          <button 
            className="btn-save-primary" 
            onClick={() => handleOpenInputForm(activeSessionNumber)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#0284c7',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_calendar</span>
            Perbarui Presensi
          </button>
        </div>
      </div>

      {/* ============================================================
          META INFO CARD
          ============================================================ */}
      <div className="siakad-meta-info-card">
        <div className="meta-grid">
          <div className="meta-col">
            <div className="meta-item">
              <span className="meta-label">Mata Pelajaran:</span>
              <span className="meta-val">{selectedScheduleInfo?.subject || 'INFORMATIKA'}</span>
            </div>
  
            <div className="meta-item">
              <span className="meta-label">Kapasitas:</span>
              <span className="meta-val">{totalStudents} Siswa</span>
            </div>
          </div>

          <div className="meta-col">
            <div className="meta-item">
              <span className="meta-label">Periode Akademik:</span>
              <span className="meta-val">
                {(() => {
                  const now = new Date();
                  const month = now.getMonth();
                  const year = now.getFullYear();
                  const semester = month >= 6 ? 'Ganjil' : 'Genap';
                  return `${year}/${year + 1} ${semester}`;
                })()}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Nama Kelas:</span>
              <span className="meta-val">{selectedScheduleInfo?.class_name || 'Kelas'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Sistem KBM:</span>
              <span className="meta-val">Reguler</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Peserta Terdaftar:</span>
              <span className="meta-val">{totalStudents} Siswa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MATERI HARI INI - HANYA 1 PERTEMUAN (DINAMIS)
          ============================================================ */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        padding: '16px 20px', 
        border: '1px solid #cbd5e1', 
        marginBottom: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>description</span>
            Materi Pertemuan ke-{activeSessionNumber} - {selectedScheduleInfo?.day || 'Hari Ini'}
          </strong>
          <button
            className="btn-edit-material"
            onClick={() => setEditingMaterialModal({
              materi: todayMaterial.materi || '',
              subMateri: todayMaterial.subMateri || '',
              ruang: todayMaterial.ruang || selectedScheduleInfo?.room || ''
            })}
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Materi
          </button>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '10px', 
          padding: '14px 16px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Materi</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: todayMaterial.materi ? '#0f172a' : '#94a3b8' }}>
                {todayMaterial.materi || 'Belum ada materi untuk pertemuan ini'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Sub-Materi</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: todayMaterial.subMateri ? '#0f172a' : '#94a3b8' }}>
                {todayMaterial.subMateri || 'Belum ada sub-materi'}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>Ruangan</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: todayMaterial.ruang ? '#0f172a' : '#94a3b8' }}>
              {todayMaterial.ruang || selectedScheduleInfo?.room || 'Belum ditentukan'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          PERSENTASE REKAPITULASI PRESENSI
          ============================================================ */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>pie_chart</span>
            Persentase Rekapitulasi Presensi Sesi Ini:
          </strong>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>
            Total: {totalStudents} Siswa Terdaftar
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#e0f2fe', border: '1px solid #93c5fd', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Hadir
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>
              {presentPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>({presentCount} Siswa)</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>medical_services</span> Sakit
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {sickPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>({sickCount} Siswa)</span>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>assignment_late</span> Izin
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>
              {permPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>({permCount} Siswa)</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Alfa
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#64748b', marginTop: '2px' }}>
              {absentPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>({absentCount} Siswa)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          VIEW MODE 1: RIWAYAT KBM & PRESENSI KELAS
          ============================================================ */}
      {activeViewMode === 'history' && (
        <div className="siakad-card-wrapper">
          {/* Sesi aktif indicator */}
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '10px', 
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>info</span>
            <span style={{ fontSize: '13px', color: '#166534' }}>
              Menampilkan data untuk <strong>Pertemuan ke-{activeSessionNumber}</strong> - {selectedScheduleInfo?.day || 'Hari Ini'}
            </span>
          </div>

          {/* Daftar Riwayat Absensi */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
               Riwayat Absensi Pertemuan ke-{activeSessionNumber}
            </h4>
            
            {loadingAttendance ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Memuat data absensi...</div>
            ) : Object.keys(savedAttendanceData).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>receipt_long</span>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Belum ada data absensi untuk pertemuan ini.
                </p>
                <button
                  onClick={() => handleOpenInputForm(activeSessionNumber)}
                  style={{
                    marginTop: '8px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Isi Presensi Sekarang
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>No</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Nama Siswa</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>NIS</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(savedAttendanceData).map(([studentId, data], idx) => {
                      // Cari nama siswa
                      const student = students.find(s => (s._id || s.id) === studentId);
                      const statusMap = {
                        'present': ' Hadir',
                        'sick': 'Sakit',
                        'permit': ' Izin',
                        'absent': ' Alfa'
                      };
                      const statusColor = {
                        'present': '#16a34a',
                        'sick': '#d97706',
                        'permit': '#2563eb',
                        'absent': '#dc2626'
                      };
                      const statusBg = {
                        'present': '#dcfce7',
                        'sick': '#fef3c7',
                        'permit': '#dbeafe',
                        'absent': '#fee2e2'
                      };
                      return (
                        <tr key={studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{student?.full_name || 'Unknown'}</td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>{student?.nis || '-'}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              background: statusBg[data.status] || '#f1f5f9',
                              color: statusColor[data.status] || '#64748b',
                              fontWeight: '700',
                              fontSize: '12px'
                            }}>
                              {statusMap[data.status] || data.status || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        
        </div>
      )}

      {/* ============================================================
          VIEW MODE 2: FORM INPUT PRESENSI SISWA
          ============================================================ */}
      {activeViewMode === 'input' && (
        <div className="attendance-input-card">
          <div className="input-card-header">
            <div>
              <h2>Form Presensi Siswa Pertemuan ke-{activeSessionNumber}</h2>
              <p>Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="header-actions">
              <button className="btn-mark-all" onClick={markAllPresent} style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined">done_all</span>
                Set Semua Hadir
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined">save</span>
                {saving ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            </div>
          </div>

          <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="summary-card total" style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#64748b' }}>groups</span>
                <span className="summary-badge" style={{ background: '#e2e8f0', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Total</span>
              </div>
              <div className="summary-card-body">
                <p className="summary-label" style={{ fontSize: '12px', color: '#64748b' }}>Total Siswa</p>
                <h3 className="summary-value" style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{totalStudents}</h3>
              </div>
            </div>

            <div className="summary-card present" style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>check_circle</span>
                <span className="summary-badge success" style={{ background: '#dcfce7', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#15803d' }}>{presentPct}% Rate</span>
              </div>
              <div className="summary-card-body">
                <p className="summary-label" style={{ fontSize: '12px', color: '#64748b' }}>Hadir Hari Ini</p>
                <h3 className="summary-value" style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>{presentCount}</h3>
              </div>
            </div>
          </div>

          <div className="search-filter-bar" style={{ marginBottom: '16px' }}>
            <div className="search-box" style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '13px', marginLeft: '8px' }}
              />
            </div>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nama Siswa</th>
                  <th className="text-center" style={{ padding: '12px 16px', textAlign: 'center' }}>Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {displayedStudents.length === 0 ? (
                  <tr><td colSpan="2" className="empty-state" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data siswa</td></tr>
                ) : (
                  displayedStudents.map((student) => {
                    const studentId = student._id || student.id;
                    const attendance = attendanceData[studentId] || { status: 'present', note: '' };
                    const statuses = [
                      { key: 'present', label: 'Hadir (H)', letter: 'H', color: 'present' },
                      { key: 'absent', label: 'Alfa (A)', letter: 'A', color: 'absent' },
                      { key: 'permit', label: 'Izin (I)', letter: 'I', color: 'permit' },
                      { key: 'sick', label: 'Sakit (S)', letter: 'S', color: 'sick' }
                    ];
                    return (
                      <tr key={studentId} className="attendance-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="student-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="student-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>account_circle</span>
                            </div>
                            <div>
                              <p className="student-name" style={{ fontWeight: '700', color: '#0f172a' }}>{student.full_name}</p>
                              <p className="student-id" style={{ fontSize: '11px', color: '#94a3b8' }}>NIS: {student.nis}</p>
                            </div>
                          </div>
                        </td>
                        <td className="status-cell text-center" style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div className="status-buttons" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {statuses.map(status => (
                              <button
                                key={status.key}
                                className={`status-btn ${status.color} ${attendance.status === status.key ? 'active' : ''}`}
                                onClick={() => updateStatus(studentId, status.key)}
                                title={status.label}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  border: attendance.status === status.key 
                                    ? `2px solid ${
                                        status.key === 'present' ? '#22c55e' :
                                        status.key === 'absent' ? '#ef4444' :
                                        status.key === 'permit' ? '#f59e0b' :
                                        '#3b82f6'
                                      }` 
                                    : '1px solid #cbd5e1',
                                  background: attendance.status === status.key 
                                    ? (
                                        status.key === 'present' ? '#dcfce7' :
                                        status.key === 'absent' ? '#fee2e2' :
                                        status.key === 'permit' ? '#fef3c7' :
                                        '#dbeafe'
                                      ) 
                                    : '#ffffff',
                                  color: attendance.status === status.key 
                                    ? (
                                        status.key === 'present' ? '#15803d' :
                                        status.key === 'absent' ? '#b91c1c' :
                                        status.key === 'permit' ? '#b45309' :
                                        '#1d4ed8'
                                      ) 
                                    : '#64748b',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {status.letter}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL EDIT MATERI HARI INI (HANYA 1 PERTEMUAN)
          ============================================================ */}
      {editingMaterialModal && (
        <div className="modal-backdrop" onClick={() => setEditingMaterialModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '540px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>edit_note</span>
                Edit Materi Pertemuan ke-{activeSessionNumber}
              </h3>
              <button onClick={() => setEditingMaterialModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#64748b' }}>close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveTodayMaterial(); }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Judul Materi Pertemuan ke-{activeSessionNumber}
                </label>
                <input
                  type="text"
                  placeholder="Masukkan judul materi..."
                  value={editingMaterialModal.materi}
                  onChange={(e) => setEditingMaterialModal({ ...editingMaterialModal, materi: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Uraian Materi
                </label>
                <textarea
                  rows="3"
                  placeholder="Masukkan uraian materi..."
                  value={editingMaterialModal.subMateri}
                  onChange={(e) => setEditingMaterialModal({ ...editingMaterialModal, subMateri: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ruang Kelas / Lab
                </label>
                <input
                  type="text"
                  placeholder="Masukkan ruangan..."
                  value={editingMaterialModal.ruang}
                  onChange={(e) => setEditingMaterialModal({ ...editingMaterialModal, ruang: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingMaterialModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  {saving ? 'Menyimpan...' : 'Simpan Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuruAttendance;