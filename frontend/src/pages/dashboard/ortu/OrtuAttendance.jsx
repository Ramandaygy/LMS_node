import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/ortu/ortu-attendance.css';

const OrtuAttendance = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSemester, setFilterSemester] = useState(new Date().getMonth() >= 6 ? 'Ganjil' : 'Genap');
  const [filterAcademicYear, setFilterAcademicYear] = useState(`${new Date().getFullYear() - (new Date().getMonth() >= 6 ? 0 : 1)}/${new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0)}`);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) fetchAttendance();
  }, [selectedChild, filterSemester, filterAcademicYear]);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/attendance/ortu/children');
      const kids = res.data.children || [];
      setChildren(kids);
      if (kids.length > 0) setSelectedChild(kids[0].id);
    } catch (err) {
      console.error('Gagal ambil data anak:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/ortu/attendance', {
        params: { child_id: selectedChild, academic_year: filterAcademicYear, semester: filterSemester },
      });
      const data = res.data.attendance || [];
      setAttendance(data);
      checkTodayNotification(data);
    } catch (err) {
      console.error('Gagal ambil absensi anak:', err);
    }
  };

  const checkTodayNotification = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data.find(a => a.date.split('T')[0] === today);
    if (todayRecord && todayRecord.status !== 'present') {
      const statusText = { absent: 'tidak hadir', permit: 'izin', late: 'izin', sick: 'sakit' };
      setNotification(`Perhatian! Anak Anda tercatat ${statusText[todayRecord.status] || todayRecord.status} hari ini.`);
      setTimeout(() => setNotification(null), 8000);
    } else {
      setNotification(null);
    }
  };

  const getStatusBadge = (status) => {
    const labels = {
      present: { text: 'Hadir', class: 'badge-present', icon: 'check_circle' },
      absent: { text: 'Absen/Alfa', class: 'badge-absent', icon: 'cancel' },
      permit: { text: 'Izin', class: 'badge-late', icon: 'mail' },
      late: { text: 'Izin', class: 'badge-late', icon: 'mail' },
      sick: { text: 'Sakit', class: 'badge-sick', icon: 'local_hospital' },
    };
    const s = labels[status] || { text: status, class: '', icon: 'info' };
    return (
      <span className={`status-badge ${s.class}`}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{s.icon}</span>
        {s.text}
      </span>
    );
  };

  // Calculate summaries
  const getSummary = () => {
    const summary = { present: 0, absent: 0, sick: 0, permit: 0 };
    attendance.forEach(a => {
      if (a.status === 'present') summary.present++;
      else if (a.status === 'absent') summary.absent++;
      else if (a.status === 'sick') summary.sick++;
      else if (a.status === 'permit' || a.status === 'late') summary.permit++;
    });
    return summary;
  };
  const summary = getSummary();

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  return (
    <div className="ortu-attendance-container">
      <div className="attendance-header">
        <h1>Pantau Absensi Anak</h1>
        <p>Lihat riwayat kehadiran harian dan rekap bulanan anak Anda</p>
      </div>

      {notification && (
        <div className="notification-banner">
          <span className="material-symbols-outlined">warning</span>
          {notification}
        </div>
      )}

      {children.length === 0 ? (
        <div className="no-children" style={{ background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>Belum ada anak terdaftar.</div>
      ) : (
        <>
          <div className="child-selector">
            {children.map(child => (
              <button 
                key={child.id} 
                onClick={() => setSelectedChild(child.id)}
                className={`child-btn ${selectedChild === child.id ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
                {child.full_name} ({child.class_name})
              </button>
            ))}
          </div>

          <div className="attendance-controls">
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Rekap Absensi</h3>
            <div className="filter-section">
              <div className="filter-group">
                <label>Tahun Ajaran</label>
                <select value={filterAcademicYear} onChange={e => setFilterAcademicYear(e.target.value)}>
                  {['2024/2025', '2025/2026', '2026/2027', '2027/2028'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Semester</label>
                <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>

          <div className="attendance-summary-cards">
            <div className="summary-card">
              <div className="summary-icon present"><span className="material-symbols-outlined">check_circle</span></div>
              <div className="summary-details">
                <h4>Hadir</h4>
                <span>{summary.present}</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon sick"><span className="material-symbols-outlined">local_hospital</span></div>
              <div className="summary-details">
                <h4>Sakit</h4>
                <span>{summary.sick}</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon late"><span className="material-symbols-outlined">mail</span></div>
              <div className="summary-details">
                <h4>Izin</h4>
                <span>{summary.permit}</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon absent"><span className="material-symbols-outlined">cancel</span></div>
              <div className="summary-details">
                <h4>Tanpa Keterangan</h4>
                <span>{summary.absent}</span>
              </div>
            </div>
          </div>

          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Status Kehadiran</th>
                  <th>Keterangan Tambahan</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="3" className="empty-message">Belum ada data absensi untuk bulan ini.</td></tr>
                ) : (
                  attendance.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: '500' }}>
                          {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td><span style={{ color: item.note ? '#334155' : '#94a3b8' }}>{item.note || 'Tidak ada catatan'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default OrtuAttendance;