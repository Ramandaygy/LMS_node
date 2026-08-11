import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/ortu/ortu.css';

const OrtuAttendance = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({ present: 0, absent: 0, sick: 0, permit: 0 });

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchAttendance(selectedChildId);
    }
  }, [selectedChildId]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/ortu/children');
      const kids = res.data.children || [];
      setChildren(kids);
      
      if (kids.length > 0) {
        setSelectedChildId(kids[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('Gagal memuat data anak.');
      setLoading(false);
    }
  };

  const fetchAttendance = async (childId) => {
    try {
      setLoading(true);
      // Fetch data for the whole semester/year. By default the backend handles current semester
      const res = await api.get(`/attendance/ortu/attendance?child_id=${childId}`);
      const records = res.data.attendance || [];
      setAttendance(records);
      
      // Calculate Stats
      let p = 0, a = 0, s = 0, pm = 0;
      records.forEach(r => {
        if (r.status === 'hadir' || r.status === 'present') p++;
        else if (r.status === 'alpa' || r.status === 'absent') a++;
        else if (r.status === 'sakit' || r.status === 'sick') s++;
        else if (r.status === 'izin' || r.status === 'permit') pm++;
      });
      setStats({ present: p, absent: a, sick: s, permit: pm });
      
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Gagal memuat riwayat kehadiran.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'hadir' || s === 'present') return <span className="badge badge-success">HADIR</span>;
    if (s === 'sakit' || s === 'sick') return <span className="badge badge-info" style={{background: '#38bdf8'}}>SAKIT</span>;
    if (s === 'izin' || s === 'permit') return <span className="badge badge-warning">IZIN</span>;
    if (s === 'alpa' || s === 'absent') return <span className="badge badge-danger">ALPA</span>;
    return <span className="badge">{status.toUpperCase()}</span>;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading && children.length === 0) return <div className="loading">Memuat data...</div>;

  return (
    <div className="ortu-dashboard">
      <main className="dashboard-main">
        <div className="page-header">
          <h2>Riwayat Kehadiran Harian</h2>
          <p>Pantau rekap kehadiran harian anak Anda selama semester berjalan.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {children.length > 0 ? (
          <>
            <div className="child-selector" style={{ marginBottom: '24px' }}>
              <label>Pilih Anak:</label>
              <div className="child-buttons">
                {children.map(child => (
                  <button
                    key={child.id}
                    className={`child-btn ${selectedChildId === child.id ? 'active' : ''}`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    {child.full_name} - {child.class_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-item" style={{ borderLeft: '4px solid #10b981' }}>
                <span className="stat-label">Hadir</span>
                <span className="stat-value" style={{ color: '#10b981' }}>{stats.present}</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '4px solid #38bdf8' }}>
                <span className="stat-label">Sakit</span>
                <span className="stat-value" style={{ color: '#38bdf8' }}>{stats.sick}</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                <span className="stat-label">Izin</span>
                <span className="stat-value" style={{ color: '#f59e0b' }}>{stats.permit}</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '4px solid #ef4444' }}>
                <span className="stat-label">Alpa</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{stats.absent}</span>
              </div>
            </div>

            <div className="card-section" style={{ background: '#fff', borderRadius: '12px', padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Detail Kehadiran</h3>
              </div>
              
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat riwayat kehadiran...</div>
              ) : attendance.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Tanggal</th>
                        <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Keterangan</th>
                        <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record, index) => (
                        <tr key={record._id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>
                            {formatDate(record.date)}
                          </td>
                          <td style={{ padding: '16px 20px', color: '#64748b' }}>
                            {record.notes || '-'}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {getStatusBadge(record.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Belum ada data kehadiran untuk anak ini di semester berjalan.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="info-card">Belum ada data anak yang terhubung ke akun Anda.</div>
        )}
      </main>
    </div>
  );
};

export default OrtuAttendance;
