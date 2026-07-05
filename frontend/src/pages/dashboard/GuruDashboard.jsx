import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/dashboard/guru/guru.css';

const GuruDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_classes: 0,
    total_assignments: 0
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeClasses, setActiveClasses] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);

  useEffect(() => {
    fetchTeacherDashboardData();
  }, []);

  const fetchTeacherDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Get profile & teacher classes
      const profileRes = await api.get('/profile');
      const profileData = profileRes.data || {};
      setProfile(profileData);

      // 2. Get students to calculate actual count per class
      const studentsRes = await api.get('/users/students/all');
      const allStudents = studentsRes.data.data || [];

      // 3. Map active classes with actual student count
      const mappedClasses = (profileData.classes || []).map(c => {
        const studentCount = allStudents.filter(s => s.class_id === c._id || s.class_id?._id === c._id).length;
        return {
          id: c._id,
          name: c.name,
          students: studentCount,
          room: 'Ruang Kelas ' + c.name
        };
      });
      setActiveClasses(mappedClasses);

      // 4. Get teacher assignments
      const assignmentsRes = await api.get('/assignments/teacher/me');
      const allAssignments = assignmentsRes.data.data || [];
      
      setRecentAssignments(allAssignments.slice(0, 3));
      
      setStats({
        total_classes: mappedClasses.length,
        total_assignments: allAssignments.length
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading teacher dashboard data', err);
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="guru-loading">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="guru-error">{error}</div>;
  }

  return (
    <div className="guru-dashboard-modern">
      {/* Welcome Header */}
      <section className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div className="header-left">
          <span className="header-badge">Dashboard Guru</span>
          <h2 className="header-title" style={{ fontSize: '28px', color: '#1e293b', fontWeight: 'bold' }}>
            Selamat Datang, {profile?.full_name || 'Guru'}!
          </h2>
          <p className="header-subtitle">Ringkasan aktivitas mengajar dan kelola tugas kelas Anda secara real-time.</p>
        </div>
      </section>

      {/* Bento Grid Metrics */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#3b82f6' }}>class</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_classes}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Kelas Diajar</p>
        </div>
        <div className="metric-small" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>assignment</span>
          <h4 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{stats.total_assignments}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Tugas Dibuat</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Active Classes */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Kelas Aktif Anda</h3>
          {activeClasses.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {activeClasses.map(cls => (
                <div key={cls.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>{cls.name}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{cls.students} Siswa Terdaftar</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/dashboard/guru/courses`)} 
                    style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Kelola
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '14px' }}>Belum ada kelas yang ditetapkan untuk Anda.</p>
          )}
        </div>

        {/* Right Column: Recent Tasks */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Tugas Terbaru</h3>
          {recentAssignments.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {recentAssignments.map(task => (
                <div key={task._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderLeft: '4px solid #10b981', background: '#f8fafc', borderRadius: '0 12px 12px 0' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '24px' }}>assignment</span>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{task.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Tenggat: {new Date(task.deadline).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => navigate('/dashboard/guru/assignments')}
                style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '600', marginTop: '8px' }}
              >
                Lihat Semua Tugas
              </button>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '14px' }}>Belum ada tugas yang dibuat.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default GuruDashboard;