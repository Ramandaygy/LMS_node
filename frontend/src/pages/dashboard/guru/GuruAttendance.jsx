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
  const [activeSessionNumber, setActiveSessionNumber] = useState(9);

  const teacherProfileName = 'Susi Herlina, S.Kom.';

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
    }
  }, [selectedSchedule, selectedClass, selectedDate, activeSessionNumber]);

  // Ambil daftar jadwal yang diampu guru
  const fetchSchedules = async () => {
    try {
      const response = await api.get('/attendance/schedules');
      const schedulesData = response.data.schedules || [];
      setSchedules(schedulesData);

      const targetScheduleId = searchParams.get('schedule_id');

      if (schedulesData.length > 0) {
        let matched = null;
        if (targetScheduleId) {
          matched = schedulesData.find(s => (s.id || s._id) === targetScheduleId);
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

  const [dbSessionsSummary, setDbSessionsSummary] = useState({});

  useEffect(() => {
    if (selectedSchedule) {
      fetchSessionsSummary(selectedSchedule);
    }
  }, [selectedSchedule]);

  const fetchSessionsSummary = async (schId) => {
    try {
      const res = await api.get(`/attendance/sessions-summary?schedule_id=${schId}`);
      if (res.data.success) {
        setDbSessionsSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching sessions summary:', err);
    }
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
      fetchSessionsSummary(selectedSchedule);
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

  // Custom topics editing state
  const [customTopics, setCustomTopics] = useState({});
  const [editingSessionModal, setEditingSessionModal] = useState(null);

  useEffect(() => {
    if (selectedSchedule) {
      try {
        const savedTopics = localStorage.getItem(`custom_session_topics_${selectedSchedule}`);
        if (savedTopics) {
          setCustomTopics(JSON.parse(savedTopics));
        } else {
          setCustomTopics({});
        }
      } catch (e) {
        setCustomTopics({});
      }
    }
  }, [selectedSchedule]);

  const handleSaveSessionTopic = () => {
    if (!editingSessionModal) return;
    const sessNum = editingSessionModal.sesi;
    const updated = {
      ...customTopics,
      [sessNum]: {
        materi: editingSessionModal.materi,
        subMateri: editingSessionModal.subMateri,
        ruang: editingSessionModal.ruang
      }
    };
    setCustomTopics(updated);
    if (selectedSchedule) {
      localStorage.setItem(`custom_session_topics_${selectedSchedule}`, JSON.stringify(updated));
    }
    setEditingSessionModal(null);
    setSuccess(`Rencana & Realisasi Materi Sesi Pertemuan ke-${sessNum} berhasil diperbarui!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Generate 16 Meetings Schedule matching SIAKAD / EdLink reference photo using real saved DB data
  const generate16SessionsList = () => {
    const baseSubject = selectedScheduleInfo?.subject || 'INFORMATIKA';
    const baseRoom = selectedScheduleInfo?.room || ('KM.D4.' + (selectedScheduleInfo?.class_name || '8A'));
    const dayName = selectedScheduleInfo?.day || 'Senin';
    const timeStr = (selectedScheduleInfo?.start_time || '07:30') + ' - ' + (selectedScheduleInfo?.end_time || '09:30');

    const defaultTopics = [
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

    return Array.from({ length: 16 }, (_, i) => {
      const sessNum = i + 1;
      const dateObj = new Date(2026, 3, 6 + (i * 7));
      const formattedDate = `${dayName}, ${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${timeStr}`;

      const realSummary = dbSessionsSummary[sessNum];
      const hasRealData = realSummary && realSummary.total > 0;

      const hadirCount = hasRealData ? realSummary.present : '-';
      const pctVal = hasRealData ? ((realSummary.present / realSummary.total) * 100).toFixed(2) + '%' : '-';

      const customData = customTopics[sessNum];

      return {
        sesi: sessNum,
        waktu: formattedDate,
        materi: customData?.materi || defaultTopics[i] || `Pembahasan Materi Sesi Pertemuan ke-${sessNum}`,
        subMateri: customData?.subMateri || `Penjelasan modul dan evaluasi KBM pertemuan ke-${sessNum}.`,
        pengajar: teacherProfileName,
        ruang: customData?.ruang || baseRoom,
        hadir: hadirCount,
        pct: pctVal,
        isCompleted: hasRealData
      };
    });
  };

  const sessions16List = generate16SessionsList();

  if (loading) {
    return <div className="attendance-loading">Memuat data Presensi Kelas & Sesi KBM Pembelajaran...</div>;
  }

  return (
    <div className="siakad-attendance-container">
      
      {/* HEADER BAR (SIAKAD STYLE) */}
      <div className="siakad-top-header">
        <div>
          <h1 className="siakad-page-title">Presensi & Pertemuan KBM Kelas</h1>
          <p className="siakad-page-subtitle">Riwayat KBM dan Rencana / Realisasi Presensi Pertemuan</p>
        </div>

        <div className="siakad-header-right-actions">
          {activeViewMode === 'input' ? (
            <button className="btn-siakad-back" onClick={() => setActiveViewMode('history')}>
              <span className="material-symbols-outlined">arrow_back</span>
              Kembali ke Riwayat Presensi
            </button>
          ) : (
            <button className="btn-siakad-back" onClick={() => navigate('/dashboard/guru')}>
              <span className="material-symbols-outlined">arrow_back</span>
              Kembali ke Dashboard Guru
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* META INFO BOX (MATCHING ADVISOR SCREENSHOT EXACTLY) */}
      <div className="siakad-meta-info-card">
        <div className="meta-grid">
          <div className="meta-col">
            <div className="meta-item">
              <span className="meta-label">Sekolah:</span>
              <span className="meta-val">SMP Negeri 1 Suradadi</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Mata Pelajaran:</span>
              <span className="meta-val">{selectedScheduleInfo?.subject || 'INFORMATIKA'} - 2 Jam Pelajaran (JP)</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Kurikulum:</span>
              <span className="meta-val">Kurikulum Merdeka 2024</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Kapasitas:</span>
              <span className="meta-val">{totalStudents} Siswa</span>
            </div>
          </div>

          <div className="meta-col">
            <div className="meta-item">
              <span className="meta-label">Periode Akademik:</span>
              <span className="meta-val">2025/2026 Genap</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Nama Kelas:</span>
              <span className="meta-val">{selectedScheduleInfo?.class_name || 'Kelas 8B'}</span>
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

      {/* PERSENTASE REKAPITULASI PRESENSI SISWA (HADIR, SAKIT, IZIN, ALPA) */}
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
          {/* HADIR */}
          <div style={{ background: '#e0f2fe', border: '1px solid #93c5fd', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Hadir
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>
              {presentPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>({presentCount} Siswa)</span>
            </div>
          </div>

          {/* SAKIT */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>medical_services</span> Sakit
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {sickPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>({sickCount} Siswa)</span>
            </div>
          </div>

          {/* IZIN */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>assignment_late</span> Izin
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>
              {permPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>({permCount} Siswa)</span>
            </div>
          </div>

          {/* ALPA */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Alpa
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#64748b', marginTop: '2px' }}>
              {absentPct}% <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>({absentCount} Siswa)</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: RIWAYAT KBM & PRESENSI KELAS (TABLE 16 PERTEMUAN - SIAKAD STYLE) */}
      {activeViewMode === 'history' && (
        <div className="siakad-table-wrapper">
          
          <div className="table-controls-row">
            <div className="schedule-select-inline">
              <label>Pilih Kelas / Jadwal:</label>
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
              >
                {schedules.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.class_name} - {s.subject} ({s.day}, {s.start_time}-{s.end_time})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-save-primary" onClick={() => handleOpenInputForm(9)}>
              <span className="material-symbols-outlined">edit_calendar</span>
              Perbaharui Presensi Pertemuan Hari Ini
            </button>
          </div>

          <table className="siakad-attendance-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Pertemuan</th>
                <th style={{ width: '180px' }}>Waktu</th>
                <th>Rencana & Realisasi Materi</th>
                <th style={{ width: '150px' }}>Pengajar</th>
                <th style={{ width: '90px' }}>Ruang</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Hadir</th>
                <th style={{ width: '80px', textAlign: 'center' }}>%</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Absen</th>
              </tr>
            </thead>
            <tbody>
              {sessions16List.map((row) => (
                <tr key={row.sesi} className={row.sesi === 9 ? 'current-active-session-row' : ''}>
                  <td className="text-center font-bold">Ke-{row.sesi}</td>
                  <td className="waktu-cell">{row.waktu}</td>
                  <td className="materi-cell">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <p className="materi-title">{row.materi}</p>
                        <p className="materi-sub">{row.subMateri}</p>
                      </div>
                      <button
                        onClick={() => setEditingSessionModal(row)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0284c7', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                        title="Edit Rencana & Realisasi Materi Pertemuan Ini"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span> Edit
                      </button>
                    </div>
                  </td>
                  <td>{row.pengajar}</td>
                  <td className="text-center">{row.ruang}</td>
                  <td className="text-center font-bold">{row.hadir}</td>
                  <td className="text-center font-bold">{row.pct}</td>
                  <td className="text-center">
                    <button
                      className={`btn-absen-icon ${row.isCompleted ? 'completed' : 'pending'}`}
                      onClick={() => handleOpenInputForm(row.sesi)}
                      title={`Isi Presensi Pertemuan ke-${row.sesi}`}
                    >
                      <span className="material-symbols-outlined">fact_check</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* MODAL EDIT RENCANA & REALISASI MATERI SESI */}
          {editingSessionModal && (
            <div className="modal-backdrop" onClick={() => setEditingSessionModal(null)}>
              <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', borderRadius: '16px' }}>
                <div className="modal-header">
                  <h3>
                    <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>edit_note</span>
                    Edit Rencana & Realisasi Materi (Pertemuan {editingSessionModal.sesi})
                  </h3>
                  <button className="btn-close-modal" onClick={() => setEditingSessionModal(null)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontWeight: '700', fontSize: '12px', color: '#334155' }}>Judul Rencana Materi Pertemuan ke-{editingSessionModal.sesi}</label>
                    <input
                      type="text"
                      value={editingSessionModal.materi}
                      onChange={(e) => setEditingSessionModal({ ...editingSessionModal, materi: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontWeight: '700', fontSize: '12px', color: '#334155' }}>Uraian Realisasi & Sub-Materi</label>
                    <textarea
                      rows="3"
                      value={editingSessionModal.subMateri}
                      onChange={(e) => setEditingSessionModal({ ...editingSessionModal, subMateri: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: '700', fontSize: '12px', color: '#334155' }}>Ruang Kelas / Lab</label>
                    <input
                      type="text"
                      value={editingSessionModal.ruang}
                      onChange={(e) => setEditingSessionModal({ ...editingSessionModal, ruang: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn-cancel" onClick={() => setEditingSessionModal(null)}>Batal</button>
                  <button
                    className="btn-submit"
                    onClick={handleSaveSessionTopic}
                    style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Simpan Perubahan Rencana
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: FORM INPUT PRESENSI SISWA PER SESI (H / A / I / S) */}
      {activeViewMode === 'input' && (
        <div className="attendance-input-card">
          
          <div className="input-card-header">
            <div>
              <h2>Form Presensi Siswa Pertemuan ke-{activeSessionNumber}</h2>
              <p>Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="header-actions">
              <button className="btn-mark-all" onClick={markAllPresent}>
                <span className="material-symbols-outlined">done_all</span>
                Set Semua Hadir
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined">save</span>
                {saving ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card total">
              <div className="summary-card-header">
                <span className="summary-icon material-symbols-outlined">groups</span>
                <span className="summary-badge">Total</span>
              </div>
              <div className="summary-card-body">
                <p className="summary-label">Total Siswa</p>
                <h3 className="summary-value">{totalStudents}</h3>
              </div>
            </div>

            <div className="summary-card present">
              <div className="summary-card-header">
                <span className="summary-icon material-symbols-outlined">check_circle</span>
                <span className="summary-badge success">{presentPct}% Rate</span>
              </div>
              <div className="summary-card-body">
                <p className="summary-label">Hadir Hari Ini</p>
                <h3 className="summary-value">{presentCount}</h3>
              </div>
            </div>
          </div>

          <div className="search-filter-bar">
            <div className="search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th className="text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {displayedStudents.length === 0 ? (
                  <tr><td colSpan="2" className="empty-state">Tidak ada data siswa</td></tr>
                ) : (
                  displayedStudents.map((student) => {
                    const studentId = student._id || student.id;
                    const attendance = attendanceData[studentId] || { status: 'present', note: '' };
                    const statuses = [
                      { key: 'present', label: 'Hadir (H)', letter: 'H', color: 'present' },
                      { key: 'absent', label: 'Absen / Alfa (A)', letter: 'A', color: 'absent' },
                      { key: 'permit', label: 'Izin (I)', letter: 'I', color: 'permit' },
                      { key: 'sick', label: 'Sakit (S)', letter: 'S', color: 'sick' }
                    ];
                    return (
                      <tr key={studentId} className="attendance-row">
                        <td>
                          <div className="student-info">
                            <div className="student-avatar"><span className="material-symbols-outlined">account_circle</span></div>
                            <div>
                              <p className="student-name">{student.full_name}</p>
                              <p className="student-id">NIS: {student.nis}</p>
                            </div>
                          </div>
                        </td>
                        <td className="status-cell text-center">
                          <div className="status-buttons" style={{ justifyContent: 'center' }}>
                            {statuses.map(status => (
                              <button
                                key={status.key}
                                className={`status-btn ${status.color} ${attendance.status === status.key ? 'active' : ''}`}
                                onClick={() => updateStatus(studentId, status.key)}
                                title={status.label}
                                style={{ fontWeight: '800', fontSize: '15px' }}
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

    </div>
  );
};

export default GuruAttendance;