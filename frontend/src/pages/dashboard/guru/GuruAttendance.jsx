import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-attendance.css';

const GuruAttendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedClassInfo, setSelectedClassInfo] = useState(null);
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
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/attendance/classes'); // asumsi endpoint
      console.log('Classes response:', response.data);
      // Asumsikan response.data.data = array kelas atau response.data.classes
      const classesData = response.data.data || response.data.classes || [];
      setClasses(classesData);
      if (classesData.length > 0) {
        setSelectedClass(classesData[0]._id || classesData[0].id);
        setSelectedClassInfo(classesData[0]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/attendance/students/${selectedClass}`); // asumsi endpoint
      // Asumsikan response.data.data = array siswa atau response.data.students
      const studentsData = response.data.data || response.data.students || [];
      setStudents(studentsData);
      const initialData = {};
      studentsData.forEach(student => {
        const studentId = student._id || student.id;
        initialData[studentId] = {
          status: 'present',
          note: ''
        };
      });
      setAttendanceData(initialData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/attendance?class_id=${selectedClass}&date=${selectedDate}`);
      const savedData = response.data.data || response.data.attendance || {};
      setAttendanceData(prev => {
        const newData = { ...prev };
        // savedData bisa berupa object dengan key student_id atau array
        if (Array.isArray(savedData)) {
          savedData.forEach(item => {
            const studentId = item.student_id?._id || item.student_id;
            if (studentId && newData[studentId]) {
              newData[studentId] = {
                ...newData[studentId],
                status: item.status,
                note: item.note || ''
              };
            }
          });
        } else {
          Object.keys(savedData).forEach(studentId => {
            if (newData[studentId]) {
              newData[studentId] = {
                ...newData[studentId],
                status: savedData[studentId].status,
                note: savedData[studentId].note || ''
              };
            }
          });
        }
        return newData;
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
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
      const attendanceList = Object.entries(attendanceData).map(([studentId, data]) => ({
        student_id: studentId,
        class_id: selectedClass,
        date: selectedDate,
        status: data.status,
        note: data.note
      }));
      await api.post('/attendance/save', { attendance: attendanceList });
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
  const absentCount = Object.values(attendanceData).filter(a => a.status === 'absent').length;
  const lateCount = Object.values(attendanceData).filter(a => a.status === 'late').length;
  const sickCount = Object.values(attendanceData).filter(a => a.status === 'sick').length;
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
            {selectedClassInfo?.name || selectedClassInfo?.class_name || 'Kelas'} - {selectedClassInfo?.subject || 'Mata Pelajaran'}
          </h1>
          <p className="attendance-subtitle">
            Topic: {selectedClassInfo?.topic || 'Pembelajaran'}
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
          <label>Select Class</label>
          <div className="selector-input">
            <span className="material-symbols-outlined">class</span>
            <select 
              value={selectedClass} 
              onChange={(e) => {
                const newClassId = e.target.value;
                setSelectedClass(newClassId);
                const cls = classes.find(c => (c._id || c.id) === newClassId);
                setSelectedClassInfo(cls);
              }}
            >
              {classes.map(cls => {
                const clsId = cls._id || cls.id;
                return (
                  <option key={clsId} value={clsId}>
                    {cls.name || cls.class_name} - {cls.subject || 'Mapel'}
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
          <h2>Student Attendance List</h2>
          <div className="table-actions">
            <button className="mark-all-btn" onClick={markAllPresent}>
              <span className="material-symbols-outlined">done_all</span>
              Mark All Present
            </button>
            <div className="filter-tabs">
              <button className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Students</button>
              <button className={`filter-tab ${activeFilter === 'present' ? 'active' : ''}`} onClick={() => setActiveFilter('present')}>Present</button>
              <button className={`filter-tab ${activeFilter === 'absent' ? 'active' : ''}`} onClick={() => setActiveFilter('absent')}>Absent</button>
              <button className={`filter-tab ${activeFilter === 'late' ? 'active' : ''}`} onClick={() => setActiveFilter('late')}>Late</button>
              <button className={`filter-tab ${activeFilter === 'sick' ? 'active' : ''}`} onClick={() => setActiveFilter('sick')}>Sick</button>
            </div>
          </div>
        </div>

        <div className="search-bar">
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Search students by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    { key: 'present', label: 'Present', icon: 'check_circle', color: 'present' },
                    { key: 'absent', label: 'Absent', icon: 'cancel', color: 'absent' },
                    { key: 'late', label: 'Late', icon: 'schedule', color: 'late' },
                    { key: 'sick', label: 'Sick', icon: 'medical_services', color: 'sick' }
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
                            >
                              <span className="material-symbols-outlined">{status.icon}</span>
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