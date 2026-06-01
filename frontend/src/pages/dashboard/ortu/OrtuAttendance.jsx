import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/ortu/ortu-attendance.css';

const OrtuAttendance = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) fetchAttendance();
  }, [selectedChild, filterMonth, filterYear]);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/ortu/children');
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
        params: { child_id: selectedChild, month: filterMonth, year: filterYear },
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
      const statusText = { absent: 'tidak hadir', late: 'terlambat', sick: 'sakit' };
      setNotification(`⚠️ Perhatian! Anak Anda ${statusText[todayRecord.status] || todayRecord.status} hari ini.`);
      setTimeout(() => setNotification(null), 5000);
    } else {
      setNotification(null);
    }
  };

  const getStatusBadge = (status) => {
    const labels = {
      present: { text: 'Hadir', class: 'badge-present' },
      absent: { text: 'Absen', class: 'badge-absent' },
      late: { text: 'Terlambat', class: 'badge-late' },
      sick: { text: 'Sakit', class: 'badge-sick' },
    };
    const s = labels[status] || { text: status, class: '' };
    return <span className={`status-badge ${s.class}`}>{s.text}</span>;
  };

  if (loading) return <div className="attendance-loading">Memuat data...</div>;

  return (
    <div className="ortu-attendance-container">
      <div className="attendance-header">
        <h1>Pantau Absensi Anak</h1>
        <p>Lihat riwayat kehadiran anak Anda</p>
      </div>

      {notification && <div className="notification-banner">{notification}</div>}

      {children.length === 0 ? (
        <div className="no-children">Belum ada anak terdaftar</div>
      ) : (
        <>
          <div className="child-selector">
            <label>Pilih Anak:</label>
            <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.full_name} - {child.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <label>Bulan</label>
              <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Tahun</label>
              <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead><tr><th>Tanggal</th><th>Status</th><th>Keterangan</th></tr></thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="3" className="empty-message">Tidak ada data absensi</td></tr>
                ) : (
                  attendance.map((item, idx) => (
                    <tr key={idx}>
                      <td>{new Date(item.date).toLocaleDateString('id-ID')}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>{item.note || '-'}</td>
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