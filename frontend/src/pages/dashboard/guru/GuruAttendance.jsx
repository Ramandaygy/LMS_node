import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-attendance.css';

const GuruAttendance = () => {
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
      if (schedulesData.length > 0) {
        // Cari jadwal yang aktif secara real-time berdasarkan hari dan jam sekarang
        const indonesianDays = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
        const now = new Date();
        const currentDayName = indonesianDays[now.getDay()];
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 1. Cari yang hari ini DAN jamnya sedang berlangsung
        let active = schedulesData.find(s => {
          const matchDay = String(s.day).toUpperCase().trim() === currentDayName;
          const matchTime = s.start_time && s.end_time && currentTimeStr >= s.start_time && currentTimeStr <= s.end_time;
          return matchDay && matchTime;
        });

        // 2. Jika tidak ada yang sedang berlangsung, cari yang hari ini saja
        if (!active) {
          active = schedulesData.find(s => String(s.day).toUpperCase().trim() === currentDayName);
        }

        // 3. Jika tidak ada, gunakan yang pertama
        const defaultSelection = active || schedulesData[0];

        setSelectedSchedule(defaultSelection.id || defaultSelection._id);
        setSelectedScheduleInfo(defaultSelection);
        setSelectedClass(defaultSelection.class_id);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Gagal mengambil data jadwal');
    } finally {
      setLoading(false);
    }
  };

  // Memuat data siswa beserta status absensi tersimpannya secara terkoordinasi (Mencegah Race Condition)
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

  const updateNote = (studentId, note) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
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
      // Siapkan payload sesuai backend (attendance, class_id, date)
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
  const totalStudents = students.length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  if (loading) {
    return <div className="attendance-loading">Memuat data...</div>;
  }

  return (
    <div className="attendance-container">
      {/* Header */}
      <div className="attendance-header">
        <div>
          <div className="header-breadcrumb">
            <span className="breadcrumb-label">Class Session</span>
            <span className="breadcrumb-dot"></span>
            <span className="breadcrumb-date">
              {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="attendance-title">
            {selectedScheduleInfo?.class_name || 'Kelas'} - {selectedScheduleInfo?.subject || 'Mata Pelajaran'}
          </h1>
          <p className="attendance-subtitle">
            Jadwal: {selectedScheduleInfo?.day || ''}, {selectedScheduleInfo?.start_time || ''} - {selectedScheduleInfo?.end_time || ''}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <span className="material-symbols-outlined">save</span>
            {saving ? 'Menyimpan...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="summary-grid">
        <div className="summary-card total">
          <div className="summary-card-header">
            <span className="summary-icon material-symbols-outlined">groups</span>
            <span className="summary-badge">Total</span>
          </div>
          <div className="summary-card-body">
            <p className="summary-label">Total Students</p>
            <h3 className="summary-value">{totalStudents}</h3>
          </div>
        </div>
        <div className="summary-card present">
          <div className="summary-card-header">
            <span className="summary-icon material-symbols-outlined">check_circle</span>
            <span className="summary-badge success">{attendanceRate}% Rate</span>
          </div>
          <div className="summary-card-body">
            <p className="summary-label">Present Today</p>
            <h3 className="summary-value">{presentCount}</h3>
          </div>
        </div>
      </div>

      <div className="class-selector">
        <div className="selector-group">
          <label>Select Schedule</label>
          <div className="selector-input">
            <span className="material-symbols-outlined">schedule</span>
            <select 
              value={selectedSchedule} 
              onChange={(e) => {
                const newSchedId = e.target.value;
                setSelectedSchedule(newSchedId);
                const sched = schedules.find(s => (s.id || s._id) === newSchedId);
                setSelectedScheduleInfo(sched);
                if (sched) setSelectedClass(sched.class_id);
              }}
            >
              {schedules.map(sched => {
                const schedId = sched.id || sched._id;
                return (
                  <option key={schedId} value={schedId}>
                    {sched.class_name} - {sched.subject} ({sched.day}, {sched.start_time}-{sched.end_time})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="selector-group">
          <label>Date</label>
          <div className="selector-input">
            <span className="material-symbols-outlined">calendar_today</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="attendance-table-container">
        <div className="table-header">
          <h2>Daftar Kehadiran Siswa</h2>
          <div className="table-actions">
            <button className="mark-all-btn" onClick={markAllPresent}>
              <span className="material-symbols-outlined">done_all</span>
              Set Semua Hadir
            </button>
            <div className="filter-tabs">
              <button className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>Semua Siswa</button>
              <button className={`filter-tab ${activeFilter === 'present' ? 'active' : ''}`} onClick={() => setActiveFilter('present')}>Hadir</button>
              <button className={`filter-tab ${activeFilter === 'absent' ? 'active' : ''}`} onClick={() => setActiveFilter('absent')}>Absen/Alfa</button>
              <button className={`filter-tab ${activeFilter === 'permit' ? 'active' : ''}`} onClick={() => setActiveFilter('permit')}>Izin</button>
              <button className={`filter-tab ${activeFilter === 'sick' ? 'active' : ''}`} onClick={() => setActiveFilter('sick')}>Sakit</button>
            </div>
          </div>
        </div>

        <div className="search-bar">
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Cari siswa berdasarkan nama atau NIS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th className="text-center">Status</th>
                <th>Note</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">Tidak ada data siswa</td></tr>
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
                      <td className="status-cell">
                        <div className="status-buttons">
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
                      <td>
                        <div className="note-input-wrapper">
                          <span className="material-symbols-outlined">chat_bubble</span>
                          <input type="text" value={attendance.note} onChange={(e) => updateNote(studentId, e.target.value)} placeholder="Add note..." className="note-input" />
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button className="action-menu"><span className="material-symbols-outlined">more_vert</span></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p className="pagination-info">Showing {displayedStudents.length} of {students.length} students</p>
        </div>
      </div>
    </div>
  );
};

export default GuruAttendance;