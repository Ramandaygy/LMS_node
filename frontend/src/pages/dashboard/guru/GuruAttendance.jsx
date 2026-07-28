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

  // Mode View: 'history' (Riwayat Perkuliahan & Presensi Kelas SIAKAD Style) vs 'input' (Form Presensi Siswa)
  const [activeViewMode, setActiveViewMode] = useState('history');
  const [activeSessionNumber, setActiveSessionNumber] = useState(9);

  const teacherProfileName = 'Susi Herlina, S.Kom.';

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedSchedule && selectedClass) {
      loadData();
    }
  }, [selectedSchedule, selectedClass, selectedDate]);

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
        api.get(`/attendance?schedule_id=${selectedSchedule}&date=${selectedDate}`)
      ]);

      const studentsData = studentsResponse.data.students || [];
      const savedData = attendanceResponse.data.attendance || {};

      setStudents(studentsData);

      const combinedData = {};
      studentsData.forEach(student => {
        const studentId = student._id || student.id;
        const saved = savedData[studentId];
        combinedData[studentId] = {
          status: saved ? saved.status : 'present',
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
        date: selectedDate
      });
      setSuccess('Absensi berhasil disimpan!');
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
  const totalStudents = students.length || 32;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 100;

  // Generate 16 Meetings Schedule matching SIAKAD / EdLink reference photo
  const generate16SessionsList = () => {
    const baseSubject = selectedScheduleInfo?.subject || 'INFORMATIKA';
    const baseRoom = selectedScheduleInfo?.room || ('KM.D4.' + (selectedScheduleInfo?.class_name || '8A'));
    const dayName = selectedScheduleInfo?.day || 'Senin';
    const timeStr = (selectedScheduleInfo?.start_time || '07:30') + ' - ' + (selectedScheduleInfo?.end_time || '09:30');

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

    return Array.from({ length: 16 }, (_, i) => {
      const sessNum = i + 1;
      const dateObj = new Date(2026, 3, 6 + (i * 7));
      const formattedDate = `${dayName}, ${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${timeStr}`;
      const isPast = sessNum <= 11;
      const hadirCount = isPast ? (sessNum % 2 === 0 ? totalStudents : totalStudents - 1) : 0;
      const pctVal = isPast ? ((hadirCount / totalStudents) * 100).toFixed(2) : '-';

      return {
        sesi: sessNum,
        waktu: formattedDate,
        materi: topics[i] || `Pembahasan Materi Sesi Pertemuan ke-${sessNum}`,
        pengajar: teacherProfileName,
        ruang: baseRoom,
        hadir: isPast ? hadirCount : '-',
        pct: isPast ? `${pctVal}%` : '-',
        isCompleted: isPast
      };
    });
  };

  const sessions16List = generate16SessionsList();

  if (loading) {
    return <div className="attendance-loading">Memuat data Presensi Kelas & Riwayat Perkuliahan...</div>;
  }

  return (
    <div className="siakad-attendance-container">
      
      {/* HEADER BAR (SIAKAD STYLE) */}
      <div className="siakad-top-header">
        <div>
          <h1 className="siakad-page-title">Presensi Kelas</h1>
          <p className="siakad-page-subtitle">Riwayat Perkuliahan dan Presensi Kelas</p>
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
          <button className="btn-siakad-pill active">Dosen / Guru</button>
          <button className="btn-siakad-pill">Siswa</button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* META INFO BOX (MATCHING ADVISOR SCREENSHOT EXACTLY) */}
      <div className="siakad-meta-info-card">
        <div className="meta-grid">
          <div className="meta-col">
            <div className="meta-item">
              <span className="meta-label">Program Studi / Sekolah:</span>
              <span className="meta-val">SMP Negeri 1 Suradadi</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Mata Pelajaran:</span>
              <span className="meta-val">{selectedScheduleInfo?.subject || 'INFORMATIKA'} - 2 Jam KBM</span>
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

      {/* VIEW MODE 1: RIWAYAT PERKULIAHAN & PRESENSI KELAS (TABLE 16 PERTEMUAN - SIAKAD STYLE) */}
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
              Perbaharui Presensi Sesi Ini (Pertemuan ke-9)
            </button>
          </div>

          <table className="siakad-attendance-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Sesi</th>
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
                  <td className="text-center font-bold">{row.sesi}</td>
                  <td className="waktu-cell">{row.waktu}</td>
                  <td className="materi-cell">
                    <p className="materi-title">{row.materi}</p>
                    <p className="materi-sub">Penjelasan modul dan evaluasi KBM pertemuan ke-{row.sesi}.</p>
                  </td>
                  <td>{row.pengajar}</td>
                  <td className="text-center">{row.ruang}</td>
                  <td className="text-center font-bold">{row.hadir}</td>
                  <td className="text-center font-bold">{row.pct}</td>
                  <td className="text-center">
                    <button
                      className={`btn-absen-icon ${row.isCompleted ? 'completed' : 'pending'}`}
                      onClick={() => handleOpenInputForm(row.sesi)}
                      title={`Isi Presensi Sesi Pertemuan ke-${row.sesi}`}
                    >
                      <span className="material-symbols-outlined">fact_check</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <button className="btn-save" onClick={handleSave} disabled={saving}>
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
                <span className="summary-badge success">{attendanceRate}% Rate</span>
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