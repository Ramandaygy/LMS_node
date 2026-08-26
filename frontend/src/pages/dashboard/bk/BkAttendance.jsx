import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css'; // Reuse existing layout styling

const BkDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> { status, note }
  
  // New States
  const [activeTab, setActiveTab] = useState('input');
  const [recapData, setRecapData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch data when class, date, or tab changes
  useEffect(() => {
    if (selectedClass) {
      if (activeTab === 'input') {
        fetchClassData();
      } else {
        fetchRecapData();
      }
    } else {
      setStudents([]);
      setAttendanceMap({});
      setRecapData({});
    }
  }, [selectedClass, selectedDate, activeTab]);

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
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get(`/attendance/students/${selectedClass}`),
        api.get(`/daily-attendance/class/${selectedClass}?date=${selectedDate}`)
      ]);
      const studentList = studentsRes.data.students || studentsRes.data.data || [];
      const savedAttendance = attendanceRes.data.data || [];

      const savedMap = {};
      savedAttendance.forEach(att => {
        savedMap[att.student_id.toString()] = {
          status: att.status,
          note: att.note || ''
        };
      });

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

  const fetchRecapData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const [studentsRes, recapRes] = await Promise.all([
        api.get(`/attendance/students/${selectedClass}`),
        api.get(`/daily-attendance/recap/class/${selectedClass}`)
      ]);
      const studentList = studentsRes.data.students || studentsRes.data.data || [];
      setStudents(studentList);
      setRecapData(recapRes.data.summary || {});
    } catch (err) {
      console.error('Error fetching recap data:', err);
      setMessage({ type: 'error', text: 'Gagal memuat data rekap absensi' });
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

  // Compute Summary
  let totalStudents = students.length;
  let presentCount = 0;
  let sickCount = 0;
  let permitCount = 0;
  let absentCount = 0;

  if (activeTab === 'input') {
    Object.values(attendanceMap).forEach(state => {
      if (state.status === 'present') presentCount++;
      else if (state.status === 'sick') sickCount++;
      else if (state.status === 'permit') permitCount++;
      else if (state.status === 'absent') absentCount++;
    });
  } else {
    // For Recap, we show total over time
    Object.values(recapData).forEach(summary => {
      presentCount += summary.present || 0;
      sickCount += summary.sick || 0;
      permitCount += summary.permit || 0;
      absentCount += summary.absent || 0;
    });
  }

  const presentPct = totalStudents > 0 && activeTab === 'input' ? Math.round((presentCount / totalStudents) * 100) : '-';
  const sickPct = totalStudents > 0 && activeTab === 'input' ? Math.round((sickCount / totalStudents) * 100) : '-';
  const permPct = totalStudents > 0 && activeTab === 'input' ? Math.round((permitCount / totalStudents) * 100) : '-';
  const absentPct = totalStudents > 0 && activeTab === 'input' ? Math.round((absentCount / totalStudents) * 100) : '-';

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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('input')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            background: activeTab === 'input' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'input' ? '#ffffff' : '#475569',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'input' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>edit_calendar</span>
          Input Kehadiran
        </button>
        <button
          onClick={() => setActiveTab('recap')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            background: activeTab === 'recap' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'recap' ? '#ffffff' : '#475569',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'recap' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>analytics</span>
          Rekapitulasi Riwayat
        </button>
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

        {activeTab === 'input' && (
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
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>pie_chart</span>
            {activeTab === 'input' ? `Persentase Kehadiran Sesi Ini (Tgl: ${selectedDate})` : 'Total Akumulasi Kehadiran (Semester Berjalan)'}
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
              {activeTab === 'input' ? `${presentPct}%` : presentCount} 
              {activeTab === 'input' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginLeft: '6px' }}>({presentCount} Siswa)</span>}
              {activeTab === 'recap' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginLeft: '6px' }}>(Total Hari)</span>}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>medical_services</span> Sakit
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {activeTab === 'input' ? `${sickPct}%` : sickCount} 
              {activeTab === 'input' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginLeft: '6px' }}>({sickCount} Siswa)</span>}
              {activeTab === 'recap' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginLeft: '6px' }}>(Total Hari)</span>}
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>assignment_late</span> Izin
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>
              {activeTab === 'input' ? `${permPct}%` : permitCount} 
              {activeTab === 'input' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', marginLeft: '6px' }}>({permitCount} Siswa)</span>}
              {activeTab === 'recap' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', marginLeft: '6px' }}>(Total Hari)</span>}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Alfa
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#64748b', marginTop: '2px' }}>
              {activeTab === 'input' ? `${absentPct}%` : absentCount} 
              {activeTab === 'input' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginLeft: '6px' }}>({absentCount} Siswa)</span>}
              {activeTab === 'recap' && <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginLeft: '6px' }}>(Total Hari)</span>}
            </div>
          </div>
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

      {/* Main Content Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        border: '1px solid #e2e8f0'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#0284c7', fontWeight: 700 }}>
            Memuat data...
          </div>
        ) : students.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>NISN</th>
                    <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>NAMA SISWA</th>
                    {activeTab === 'input' ? (
                      <>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>STATUS ABSENSI</th>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>CATATAN / KETERANGAN</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#0284c7', textAlign: 'center' }}>HADIR</th>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#eab308', textAlign: 'center' }}>SAKIT</th>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#3b82f6', textAlign: 'center' }}>IZIN</th>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#ef4444', textAlign: 'center' }}>ALFA</th>
                        <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>TOTAL HARI</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentId = (student._id || student.id).toString();
                    
                    if (activeTab === 'input') {
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
                    } else {
                      // Recap Tab Row
                      const rData = recapData[studentId] || { present: 0, sick: 0, permit: 0, absent: 0, total: 0 };
                      return (
                        <tr key={studentId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                          <td style={{ padding: '16px 12px', fontSize: '14px', color: '#64748b' }}>
                            {student.nisn || student.nis || student.username || '-'}
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                            {student.full_name || student.name}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{rData.present}</td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: '#eab308' }}>{rData.sick}</td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: '#3b82f6' }}>{rData.permit}</td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{rData.absent}</td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{rData.total} Hari</td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {activeTab === 'input' && (
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
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Tidak ada data siswa untuk kelas ini.
          </div>
        )}
      </div>
    </div>
  );
};

export default BkDashboard;
