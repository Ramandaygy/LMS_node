import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/dashboard/ortu/ortu.css';

const OrtuDashboard = () => {
  const [stats, setStats] = useState({
    total_children: 0,
    average_progress: 0
  });
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsResponse = await api.get('/dashboard/stats');
      setStats(statsResponse.data);
      
      // Fetch children list
      const childrenResponse = await api.get('/users/children');
      setChildren(childrenResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Dashboard Orang Tua</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👨‍👩‍👧</div>
          <div className="stat-number">{stats.total_children}</div>
          <div className="stat-label">Anak Terdaftar</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-number">{stats.average_progress}%</div>
          <div className="stat-label">Rata-rata Progress</div>
        </div>
      </div>

      <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '10px' }}>
        <h3 className="section-title">Progress Anak</h3>
        {children.length === 0 ? (
          <p>Belum ada anak terdaftar</p>
        ) : (
          children.map(child => (
            <div key={child.id} className="course-card" style={{ marginBottom: '15px' }}>
              <div className="course-content">
                <h4>{child.full_name}</h4>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>NIS: {child.nis}</p>
                <div className="course-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${child.progress || 0}%` }}></div>
                  </div>
                  <p style={{ marginTop: '5px', fontSize: '14px' }}>Progress: {child.progress || 0}%</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '10px' }}>
        <h3 className="section-title">Akses Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary">Lihat Laporan Lengkap</button>
          <button className="btn btn-primary">Hubungi Guru</button>
        </div>
      </div>
    </div>
  );
};

export default OrtuDashboard;