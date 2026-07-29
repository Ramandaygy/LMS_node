import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-attendance.css';

const SiswaAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, sick: 0 });
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendance();
  }, [filterMonth, filterYear]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/siswa/attendance', {
        params: { month: filterMonth, year: filterYear },
      });
      const data = res.data.attendance || [];
      setAttendance(data);
      calculateSummary(data);
    } catch (err) {
      console.error('Gagal ambil absensi:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    let present = 0, absent = 0, permit = 0, sick = 0;
    data.forEach(item => {
      if (item.status === 'present') present++;
      else if (item.status === 'absent') absent++;
      else if (item.status === 'permit' || item.status === 'late') permit++;
      else if (item.status === 'sick') sick++;
    });
    setSummary({ present, absent, permit, sick });
  };

  const getStatusBadge = (status) => {
    const labels = {
      present: { text: 'Hadir', class: 'badge-present' },
      absent: { text: 'Absen/Alfa', class: 'badge-absent' },
      permit: { text: 'Izin', class: 'badge-late' },
      late: { text: 'Izin', class: 'badge-late' },
      sick: { text: 'Sakit', class: 'badge-sick' },
    };
    const s = labels[status] || { text: status, class: '' };
    return <span className={`status-badge ${s.class}`}>{s.text}</span>;
  };

  if (loading) return <div className="attendance-loading">Memuat data absensi...</div>;

  return (
    <div className="siswa-attendance-container">
      <div className="attendance-header">
        <h1>Riwayat Absensi Saya</h1>
        <p>Lihat kehadiran Anda per bulan</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card present">
          <div className="card-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="card-info">
            <span className="card-num">{summary.present}</span>
            <span className="card-label">Hadir</span>
          </div>
        </div>
        <div className="summary-card absent">
          <div className="card-icon"><span className="material-symbols-outlined">cancel</span></div>
          <div className="card-info">
            <span className="card-num">{summary.absent}</span>
            <span className="card-label">Alpa</span>
          </div>
        </div>
        <div className="summary-card late">
          <div className="card-icon"><span className="material-symbols-outlined">description</span></div>
          <div className="card-info">
            <span className="card-num">{summary.permit}</span>
            <span className="card-label">Izin</span>
          </div>
        </div>
        <div className="summary-card sick">
          <div className="card-icon"><span className="material-symbols-outlined">medical_services</span></div>
          <div className="card-info"><h3>Sakit</h3><p>{summary.sick} hari</p></div>
        </div>
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
    </div>
  );
};

export default SiswaAttendance;