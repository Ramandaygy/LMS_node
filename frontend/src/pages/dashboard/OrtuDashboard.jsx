import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/dashboard/ortu/ortu.css';

const OrtuDashboard = () => {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    try {
      // Ambil profil orang tua
      const profileRes = await api.get('/profile');
      setUser(profileRes.data);

      // Ambil daftar anak
      const childrenRes = await api.get('/ortu/children');
      const kids = childrenRes.data.children || [];
      setChildren(kids);
      if (kids.length > 0) {
        setSelectedChild(kids[0]);
        fetchProgress(kids[0].id);
      }
    } catch (err) {
      console.error('Error fetching parent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (childId) => {
    try {
      const res = await api.get(`/ortu/children/${childId}/progress`);
      setProgress(res.data.data);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setProgress(null);
    }
  };

  const handleChildChange = (child) => {
    setSelectedChild(child);
    fetchProgress(child.id);
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  if (loading) return <div className="loading">Memuat dashboard...</div>;

  return (
    <div className="ortu-dashboard">
      {/* Header dengan Hamburger */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="avatar">
            {user?.profileImage ? <img src={user.profileImage} alt="avatar" /> : 
              <span className="material-symbols-outlined">account_circle</span>}
          </div>
          <div>
            <h1 className="school-name">SMP N 1 LMS</h1>
            <p className="user-greeting">Halo, {user?.full_name?.split(' ')[0] || 'Orang Tua'}</p>
          </div>
        </div>
        <button className="hamburger" onClick={toggleMenu}>
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Overlay dan Mobile Nav */}
      <div className={`menu-overlay ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>
      <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <ul>
          <li><a href="/dashboard/ortu"><span className="material-symbols-outlined">dashboard</span> Dashboard</a></li>
          <li><a href="/dashboard/ortu/children"><span className="material-symbols-outlined">groups</span> Data Anak</a></li>
          <li><a href="/dashboard/ortu/monitoring"><span className="material-symbols-outlined">monitoring</span> Monitoring</a></li>
          <li><a href="/profile"><span className="material-symbols-outlined">person</span> Profil</a></li>
        </ul>
      </nav>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Pantau Perkembangan Belajar Anak Anda</h2>
          <p>Lihat progress, nilai, dan rekomendasi belajar</p>
        </div>

        {/* Pilih Anak */}
        {children.length > 0 && (
          <div className="child-selector">
            <label>Pilih Anak:</label>
            <div className="child-buttons">
              {children.map(child => (
                <button
                  key={child.id}
                  className={`child-btn ${selectedChild?.id === child.id ? 'active' : ''}`}
                  onClick={() => handleChildChange(child)}
                >
                  {child.full_name} - {child.class_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Card */}
        {selectedChild && progress && (
          <div className="progress-card">
            <h3>Progress Belajar {selectedChild.full_name}</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Rata-rata Nilai</span>
                <span className="stat-value">{progress.avgScore?.toFixed(1) || 0}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Kehadiran</span>
                <span className="stat-value">{progress.attendanceRate?.toFixed(1) || 100}%</span>
              </div>
              <div className={`stat-item risk-${progress.risk}`}>
                <span className="stat-label">Status</span>
                <span className="stat-value">{progress.message || 'Normal'}</span>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-label">Progress Akademik</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.avgScore || 0}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder jika belum ada progress */}
        {selectedChild && !progress && (
          <div className="info-card">Belum ada data progress untuk anak ini.</div>
        )}

        {/* Rekomendasi Sederhana */}
        <div className="suggestion-card">
          <h3>Tips untuk Orang Tua</h3>
          <ul>
            <li>✔️ Pantau jadwal belajar anak secara rutin</li>
            <li>✔️ Diskusikan tugas yang sulit dengan guru</li>
            <li>✔️ Beri motivasi dan apresiasi atas usaha anak</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default OrtuDashboard;