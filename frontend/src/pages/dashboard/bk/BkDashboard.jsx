import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css'; // Reuse existing layout styling

const BkDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> { status, note }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch students & their attendance when class or date changes
  useEffect(() => {
    if (selectedClass) {
      fetchClassData();
    } else {
      setStudents([]);
      setAttendanceMap({});
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const classList = res.data.classes || res.data.data || [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClass(classList[0]._id || classList[0].id);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setMessage({ type: 'error', text: 'Gagal memuat daftar kelas' });
    }
  };

  const fetchClassData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. Fetch students of this class
      const studentsRes = await api.get(`/attendance/students/${selectedClass}`);
      const studentList = studentsRes.data.students || studentsRes.data.data || [];
      
      // 2. Fetch existing daily attendance for this class and date
      const attendanceRes = await api.get(`/daily-attendance/class/${selectedClass}?date=${selectedDate}`);
      const savedAttendance = attendanceRes.data.data || [];

      // Map saved attendance
      const savedMap = {};
      savedAttendance.forEach(att => {
        savedMap[att.student_id.toString()] = {
          status: att.status,
          note: att.note || ''
        };
      });

      // Initialize attendance map for all students (default to present)
      const initialMap = {};
      studentList.forEach(student => {
        const studentId = (student._id || student.id).toString();
        if (savedMap[studentId]) {
          initialMap[studentId] = savedMap[studentId];
        } else {
          initialMap[studentId] = { status: 'present', note: '' };
        }
      });

      setStudents(studentList);
      setAttendanceMap(initialMap);
    } catch (err) {
      console.error('Error fetching class data:', err);
      setMessage({ type: 'error', text: 'Gagal memuat data absensi kelas' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNoteChange = (studentId, note) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const attendanceList = Object.keys(attendanceMap).map(studentId => ({
        student_id: studentId,
        status: attendanceMap[studentId].status,
        note: attendanceMap[studentId].note
      }));

      await api.post('/daily-attendance/upsert', {
        class_id: selectedClass,
        date: selectedDate,
        attendance: attendanceList
      });

      setMessage({ type: 'success', text: 'Absensi harian berhasil disimpan!' });
    } catch (err) {
      console.error('Error saving attendance:', err);
      setMessage({ type: 'error', text: 'Gagal menyimpan absensi' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-students-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '20px',
        padding: '30px 36px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 12px 30px rgba(2, 132, 199, 0.2)'
      }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 8px 0' }}>Dashboard Guru BK</h1>
        <p style={{ fontSize: '14px', margin: 0, opacity: 0.9 }}>
          Mencatat dan memonitor kehadiran harian siswa untuk keperluan Rapor.
        </p>
      </div>

      {/* Filter Controls */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>PILIH KELAS</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {classes.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>PILIH TANGGAL</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: 700,
          fontSize: '14px',
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Students Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        border: '1px solid #e2e8f0'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#0284c7', fontWeight: 700 }}>
            Memuat daftar siswa...
          </div>
        ) : students.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>NISN</th>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>NAMA SISWA</th>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>STATUS ABSENSI</th>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>CATATAN / KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentId = (student._id || student.id).toString();
                    const state = attendanceMap[studentId] || { status: 'present', note: '' };

                    return (
                      <tr key={studentId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#64748b' }}>
                          {student.nisn || student.nis || student.username || '-'}
                        </td>
                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {student.full_name || student.name}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            {[
                              { key: 'present', label: 'Hadir', activeBg: '#22c55e', color: '#ffffff' },
                              { key: 'sick', label: 'Sakit', activeBg: '#eab308', color: '#ffffff' },
                              { key: 'permit', label: 'Izin', activeBg: '#3b82f6', color: '#ffffff' },
                              { key: 'absent', label: 'Alfa', activeBg: '#ef4444', color: '#ffffff' }
                            ].map(opt => {
                              const isActive = state.status === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleStatusChange(studentId, opt.key)}
                                  style={{
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: isActive ? opt.activeBg : 'transparent',
                                    color: isActive ? opt.color : '#64748b',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <input
                            type="text"
                            placeholder="Alasan izin, sakit, dll..."
                            value={state.note}
                            onChange={(e) => handleNoteChange(studentId, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  transition: 'opacity 0.2s'
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Absensi Harian'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Tidak ada siswa di kelas ini.
          </div>
        )}
      </div>
    </div>
  );
};

export default BkDashboard;
