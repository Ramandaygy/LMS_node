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
      const assignmentsRes = await api.get('/assignments/guru/me');
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
      <div className="guru-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', fontWeight: '600' }}>Memuat dashboard guru...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guru-error" style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', color: '#991b1b', margin: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Error</h4>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  const quickShortcuts = [
    { title: 'Bagikan Materi', icon: 'auto_stories', path: '/dashboard/guru/materials', bg: '#eff6ff', color: '#2563eb', border: '#3b82f6', desc: 'Unggah file PDF/Link bahan ajar.' },
    { title: 'Tugas Kelas', icon: 'assignment', path: '/dashboard/guru/assignments', bg: '#ecfdf5', color: '#059669', border: '#10b981', desc: 'Buat & nilai tugas para siswa.' },
    { title: 'Absensi Harian', icon: 'done_all', path: '/dashboard/guru/attendance', bg: '#fffbeb', color: '#d97706', border: '#f59e0b', desc: 'Isi kehadiran kelas hari ini.' },
    { title: 'Input Nilai Ujian', icon: 'percent', path: '/dashboard/guru/nilai', bg: '#fff1f2', color: '#e11d48', border: '#f43f5e', desc: 'Masukkan hasil ujian siswa.' }
  ];

  return (
    <div className="guru-dashboard-modern-container" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Hero Welcome Card Banner */}
      <section 
        className="hero-welcome-banner" 
        style={{ 
          background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)', 
          borderRadius: '24px', 
          padding: '32px', 
          color: '#fff', 
          position: 'relative', 
          overflow: 'hidden', 
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.2)',
          marginBottom: '32px'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span 
            className="hero-badge" 
            style={{ 
              display: 'inline-block', 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(10px)', 
              color: '#fff', 
              padding: '6px 14px', 
              borderRadius: '30px', 
              fontSize: '11px', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '16px' 
            }}
          >
            PANEL GURU • REAL-TIME
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.5px' }}>
            Selamat Datang, {profile?.full_name || 'Guru'}!
          </h2>
          <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500', maxWidth: '600px', lineHeight: '1.5' }}>
            Kelola proses KBM, bagikan materi ajar, pantau progress siswa, dan catat absensi kelas dengan mudah dalam satu tempat.
          </p>
        </div>
        {/* Dynamic Abstract Background Accents */}
        <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', top: '-50px', right: '-50px', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', bottom: '-150px', right: '50px', zIndex: 1 }}></div>
      </section>

      {/* Grid Quick Shortcuts Section */}
      <h3 style={{ fontSize: '20px', color: '#0f172a', fontWeight: '800', marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>
        Pusat Kontrol Guru
      </h3>
      <div 
        className="shortcuts-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '20px', 
          marginBottom: '40px' 
        }}
      >
        {quickShortcuts.map((sc, i) => (
          <div 
            key={i}
            className="shortcut-card-interactive"
            onClick={() => navigate(sc.path)}
            style={{ 
              background: '#fff', 
              border: '1px solid #e2e8f0', 
              borderTop: `4px solid ${sc.border}`,
              borderRadius: '20px', 
              padding: '24px', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ background: sc.bg, padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: sc.color, fontSize: '24px' }}>{sc.icon}</span>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: '18px' }}>arrow_forward</span>
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px 0' }}>{sc.title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>{sc.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Info Lists Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        
        {/* Left Bento: Active Classes */}
        <div style={{ background: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Kelas Aktif Anda</h3>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5', background: '#eff6ff', padding: '4px 10px', borderRadius: '20px' }}>{stats.total_classes} Kelas</span>
          </div>

          {activeClasses.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {activeClasses.map(cls => (
                <div 
                  key={cls.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    border: '1px solid #f1f5f9', 
                    background: '#f8fafc',
                    borderRadius: '16px',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{cls.name}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{cls.students} Siswa Terdaftar</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/dashboard/guru/attendance`)} 
                    style={{ 
                      background: '#4f46e5', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '8px 16px', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      fontSize: '12px', 
                      fontWeight: '700',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
                      transition: 'background 0.2s'
                    }}
                  >
                    Absensi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>class</span>
              <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', fontWeight: '500', textAlign: 'center' }}>Belum ada kelas yang ditetapkan untuk Anda.</p>
            </div>
          )}
        </div>

        {/* Right Bento: Recent Tasks */}
        <div style={{ background: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Tugas Terbaru</h3>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px' }}>{stats.total_assignments} Tugas</span>
          </div>

          {recentAssignments.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {recentAssignments.map(task => (
                <div 
                  key={task._id} 
                  style={{ 
                    display: 'flex', 
                    gap: '14px', 
                    alignItems: 'center', 
                    padding: '16px', 
                    borderLeft: '4px solid #10b981', 
                    background: '#f8fafc', 
                    borderRadius: '0 16px 16px 0',
                    border: '1px solid #f1f5f9',
                    borderLeftWidth: '4px'
                  }}
                >
                  <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '20px' }}>assignment</span>
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{task.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      Tenggat: {new Date(task.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => navigate('/dashboard/guru/assignments')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontSize: '13px', 
                  color: '#475569', 
                  fontWeight: '700', 
                  marginTop: '8px',
                  transition: 'all 0.2s'
                }}
              >
                Lihat Semua Tugas
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>assignment_late</span>
              <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', fontWeight: '500', textAlign: 'center' }}>Belum ada tugas yang dibuat.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GuruDashboard;