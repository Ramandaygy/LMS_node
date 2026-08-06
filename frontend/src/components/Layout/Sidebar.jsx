import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { profileService } from '../../services/profile';
import '../../styles/components/sidebar.css';

const Sidebar = ({ role, activeMenu, onMenuChange, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const localUserObj = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  })();
  const userRole = user?.role || localUserObj?.role || role;

  const [homeroomStatus, setHomeroomStatus] = useState(() => {
    try {
      const cached = localStorage.getItem('homeroomStatus');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  // Fetch user profile for dynamic display
  const fetchUserProfile = async () => {
    try {
      const userData = await profileService.getProfile();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const localUser = localStorage.getItem('user');
      if (localUser) {
        setUser(JSON.parse(localUser));
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
    if (userRole === 'guru') {
      const checkHomeroom = async () => {
        try {
          const api = (await import('../../services/api')).default;
          const res = await api.get('/guru/homeroom-status');
          if (res.data.success && res.data.is_homeroom) {
            setHomeroomStatus(res.data.homeroom_class);
            localStorage.setItem('homeroomStatus', JSON.stringify(res.data.homeroom_class));
          } else {
            setHomeroomStatus(null);
            localStorage.removeItem('homeroomStatus');
          }
        } catch (e) {
          console.error('Failed to check homeroom status:', e);
        }
      };
      checkHomeroom();
    }
  }, [userRole]);

  // Refresh user data when profile is updated
  useEffect(() => {
    const handleStorageChange = () => {
      fetchUserProfile();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [guruMode, setGuruMode] = useState(() => localStorage.getItem('guruMode') || 'guru');

  useEffect(() => {
    if (location.pathname === '/dashboard/guru/walikelas') {
      setGuruMode('walikelas');
      localStorage.setItem('guruMode', 'walikelas');
    }
  }, [location.pathname]);

  const guruMapelMenuList = [
    { key: 'dashboard', label: 'Dashboard Guru', icon: 'space_dashboard', path: '/dashboard/guru' },
    { key: 'courses', label: 'Modul Guru (KBM)', icon: 'school', path: '/dashboard/guru/courses' },
    { key: 'materials', label: 'Bank Materi', icon: 'card_membership', path: '/dashboard/guru/materials' },
    { key: 'assignments', label: 'Tugas Kelas', icon: 'assignment', path: '/dashboard/guru/assignments' },
    { key: 'attendance', label: 'Absensi & Presensi', icon: 'event_available', path: '/dashboard/guru/attendance' },
    { key: 'input-nilai', label: 'Input Nilai', icon: 'edit_note', path: '/dashboard/guru/input-nilai' },
    { key: 'monitoring', label: 'Leger Nilai Sekolah', icon: 'table_view', path: '/dashboard/guru/leger' },
    { key: 'quiz', label: 'Quiz Live', icon: 'emoji_objects', path: '/dashboard/guru/quiz' },
    { key: 'cbt', label: 'Ujian CBT', icon: 'quiz', path: '/dashboard/guru/cbt' },
    { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/guru/calendar' },
  ];

  const waliKelasMenuList = [
    { key: 'walikelas', label: 'Dashboard Wali Kelas', icon: 'shield_person', path: '/dashboard/guru/walikelas' },
    { key: 'students', label: homeroomStatus ? `Siswa Binaan (${homeroomStatus.name})` : 'Siswa Binaan', icon: 'group', path: '/dashboard/guru/students' },
    { key: 'progress', label: 'Progress & Presensi Kelas', icon: 'trending_up', path: '/dashboard/guru/progress' },
    { key: 'monitoring', label: 'Leger Nilai Sekolah', icon: 'table_view', path: '/dashboard/guru/leger' },
    { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/guru/calendar' },
  ];

  const activeGuruMenuList = (userRole === 'guru' && guruMode === 'walikelas')
    ? waliKelasMenuList
    : guruMapelMenuList;

  const menus = {
    admin: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/admin' },
      { key: 'data-master', label: 'Data Master', icon: 'database', path: '/dashboard/admin/data-master' },
      { key: 'settings', label: 'Kop Surat', icon: 'settings', path: '/dashboard/admin/settings' },
      { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/admin/calendar' },
    ],
    super_admin: [
      { key: 'dashboard', label: 'Dashboard Sistem', icon: 'dashboard', path: '/dashboard/admin' },
      { key: 'accounts', label: 'Manajemen Akun', icon: 'manage_accounts', path: '/dashboard/superadmin/accounts' },
      { key: 'roles', label: 'Hak Akses', icon: 'rule', path: '/dashboard/superadmin/roles' },
      { key: 'settings', label: 'Pengaturan Sistem', icon: 'settings', path: '/dashboard/superadmin/settings' },
      { key: 'activity-logs', label: 'Activity Log', icon: 'history', path: '/dashboard/superadmin/activity-logs' },
      { key: 'backup', label: 'Backup Database', icon: 'backup', path: '/dashboard/superadmin/backup' },
    ],
    wakil_kurikulum: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/admin' },
      { key: 'academic-year', label: 'Tahun Ajaran', icon: 'calendar_month', path: '/dashboard/admin/academic-year' },
      { key: 'assignments', label: 'Penjadwalan Guru', icon: 'assignment_ind', path: '/dashboard/admin/schedule' },
      { key: 'reports', label: 'Laporan', icon: 'analytics', path: '/dashboard/admin/reports' },
      { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/admin/calendar' },
    ],
    bk: [
      { key: 'dashboard', label: 'Absensi Harian (Rapor)', icon: 'event_available', path: '/dashboard/bk' },
      { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/admin/calendar' },
    ],
    guru: activeGuruMenuList,
    siswa: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/siswa' },
      { key: 'cbt', label: 'Simulasi Ujian CBT', icon: 'quiz', path: '/dashboard/siswa/cbt' },
      { key: 'quiz', label: 'Quiz Live', icon: 'bolt', path: '/dashboard/siswa/quiz' },
      { key: 'progress', label: 'Progress', icon: 'trending_up', path: '/dashboard/siswa/progress' },
      { key: 'assignments', label: 'Tugas', icon: 'assignment', path: '/dashboard/siswa/assignments' },
      { key: 'materials', label: 'Materi', icon: 'card_membership', path: '/dashboard/siswa/materials' },
      { key: 'schedule', label: 'Jadwal', icon: 'calendar_month', path: '/dashboard/siswa/schedule' },
      { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/siswa/calendar' },
    ],
    ortu: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/ortu' },
      { key: 'children', label: 'Data Anak', icon: 'family_restroom', path: '/dashboard/ortu/children' },
      { key: 'attendance', label: 'Kehadiran Anak', icon: 'event_available', path: '/dashboard/ortu/attendance' },
      { key: 'schedule', label: 'Jadwal Anak', icon: 'calendar_month', path: '/dashboard/ortu/schedule' },
      { key: 'monitoring', label: 'Monitoring AI', icon: 'psychology', path: '/dashboard/ortu/monitoring' },
      { key: 'reports', label: 'Laporan', icon: 'receipt', path: '/dashboard/ortu/reports' },
      { key: 'calendar', label: 'Kalender Info', icon: 'event', path: '/dashboard/ortu/calendar' },
    ]
  };

  // Resolve current menus based on role and active teaching/admin mode
  let currentMenus = menus[userRole] || menus.siswa;
  if (userRole === 'wakil_kurikulum') {
    currentMenus = (guruMode === 'wakil_kurikulum') ? menus.wakil_kurikulum : guruMapelMenuList;
  } else if (userRole === 'bk') {
    currentMenus = (guruMode === 'bk') ? menus.bk : guruMapelMenuList;
  } else if (userRole === 'guru') {
    currentMenus = (guruMode === 'walikelas' && homeroomStatus) ? waliKelasMenuList : guruMapelMenuList;
  }

  const roleNames = {
    admin: 'ADMIN TU',
    super_admin: 'SUPER ADMIN',
    wakil_kurikulum: 'WAKIL KURIKULUM',
    guru: 'GURU MAPEL',
    bk: 'GURU BK',
    siswa: 'SISWA',
    ortu: 'ORANG TUA'
  };

  const getDisplayRole = () => {
    if (userRole === 'guru' && guruMode === 'walikelas' && homeroomStatus) {
      return `WALI KELAS (${homeroomStatus.name})`;
    }
    if (userRole === 'wakil_kurikulum') {
      return (guruMode === 'guru') ? 'GURU MAPEL (WAKA)' : 'WAKIL KURIKULUM';
    }
    if (userRole === 'bk') {
      return (guruMode === 'guru') ? 'GURU MAPEL (BK)' : 'GURU BK';
    }
    return roleNames[userRole] || userRole?.toUpperCase() || 'User';
  };


  const getActiveKeyFromPath = () => {
    const currentPath = location.pathname;
    const roleBasePaths = new Set([
      '/dashboard/admin',
      '/dashboard/guru',
      '/dashboard/siswa',
      '/dashboard/ortu',
    ]);
    for (const menu of currentMenus) {
      if (currentPath === menu.path) return menu.key;
      if (!roleBasePaths.has(menu.path) && currentPath.startsWith(menu.path)) return menu.key;
    }
    if (currentPath.startsWith('/dashboard/admin')) return 'dashboard';
    if (currentPath.startsWith('/dashboard/guru')) return 'dashboard';
    if (currentPath.startsWith('/dashboard/siswa')) return 'dashboard';
    if (currentPath.startsWith('/dashboard/ortu')) return 'dashboard';
    if (currentPath === '/profile') return 'profile';
    return activeMenu;
  };

  useEffect(() => {
    const newActiveKey = getActiveKeyFromPath();
    if (newActiveKey !== activeMenu) onMenuChange(newActiveKey);
  }, [location.pathname]);

  const activeKey = getActiveKeyFromPath();

  const handleMenuClick = (menu) => {
    onMenuChange(menu.key);
    navigate(menu.path);
    if (onClose) onClose(); // tutup sidebar setelah klik menu (di mobile)
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Handle profile
  const handleProfile = () => {
    navigate('/profile');
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.username) return user.username;
    return 'Pengguna';
  };

  return (
    <>
      <aside className={`sidebar-modern ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        
        {/* Toggle Button Hamburger */}
        <div className="sidebar-toggle-header">
          <button 
            className="hamburger-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Buka Menu" : "Tutup Menu"}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        {/* Konten sidebar (user info, menu, footer) */}
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt="Avatar" />
            ) : (
              <span className="avatar-initials">{getInitials(getDisplayName())}</span>
            )}
          </div>
          <div className="sidebar-user-details">
            <p className="sidebar-user-name">{getDisplayName()}</p>
            <p className="sidebar-user-role">{getDisplayRole()}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {currentMenus.map(menu => (
            <a
              key={menu.key}
              className={`sidebar-nav-item ${activeKey === menu.key ? 'active' : ''}`}
              onClick={() => handleMenuClick(menu)}
            >
              <span className="material-symbols-outlined">{menu.icon}</span>
              <span>{menu.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-links">
            <div className="sidebar-footer-link" onClick={handleProfile}>
              <span className="material-symbols-outlined">account_circle</span>
              Profil Saya
            </div>

            {((userRole === 'guru' && homeroomStatus) || userRole === 'wakil_kurikulum' || userRole === 'bk') && (
              <div style={{ padding: '6px 12px 6px 12px', width: '100%', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', margin: '4px 0' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '3px' }}>
                  Switch Mode Dashboard:
                </label>
                <select
                  value={guruMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGuruMode(val);
                    localStorage.setItem('guruMode', val);
                    
                    if (val === 'walikelas') {
                      navigate('/dashboard/guru/walikelas');
                    } else if (val === 'wakil_kurikulum') {
                      navigate('/dashboard/admin');
                    } else if (val === 'bk') {
                      navigate('/dashboard/bk');
                    } else {
                      navigate('/dashboard/guru');
                    }
                    if (onClose) onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #0284c7',
                    background: '#eff6ff',
                    color: '#0369a1',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="guru">📘 Mode Guru Mapel (KBM)</option>
                  {userRole === 'guru' && homeroomStatus && (
                    <option value="walikelas">🛡️ Mode Wali Kelas ({homeroomStatus.name})</option>
                  )}
                  {userRole === 'wakil_kurikulum' && (
                    <option value="wakil_kurikulum">⚙️ Mode Wakil Kurikulum</option>
                  )}
                  {userRole === 'bk' && (
                    <option value="bk">💼 Mode Guru BK</option>
                  )}
                </select>
              </div>
            )}

            <div className="sidebar-footer-link" onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span>
              Logout
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;