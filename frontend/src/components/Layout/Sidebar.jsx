import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { profileService } from '../../services/profile';
import '../../styles/components/sidebar.css';

const Sidebar = ({  role, activeMenu, onMenuChange, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  // Fetch user profile for dynamic display
  const fetchUserProfile = async () => {
    try {
      const userData = await profileService.getProfile();
      setUser(userData);
      // Update localStorage to keep consistency
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to localStorage
      const localUser = localStorage.getItem('user');
      if (localUser) {
        setUser(JSON.parse(localUser));
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Refresh user data when profile is updated
  useEffect(() => {
    const handleStorageChange = () => {
      fetchUserProfile();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const menus = {
    admin: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/admin' },
      { key: 'data-master', label: 'Data Master', icon: 'database', path: '/dashboard/admin/data-master' },
      { key: 'academic-year', label: 'Tahun Ajaran', icon: 'calendar_month', path: '/dashboard/admin/academic-year' },
      { key: 'assignments', label: 'Assign Guru', icon: 'assignment_ind', path: '/dashboard/admin/schedule' },
      { key: 'reports', label: 'Laporan', icon: 'analytics', path: '/dashboard/admin/reports' },
    ],
    guru: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/guru' },
      { key: 'materials', label: 'Materi', icon: 'card_membership', path: '/dashboard/guru/materials' },
      { key: 'students', label: 'Siswa Binaan', icon: 'group', path: '/dashboard/guru/students' },
      { key: 'assignments', label: 'Tugas', icon: 'assignment', path: '/dashboard/guru/assignments' },
      { key: 'attendance', label: 'Absensi', icon: 'event_available', path: '/dashboard/guru/attendance' },
      { key: 'monitoring', label: 'Monitoring', icon: 'psychology', path: '/dashboard/guru/monitoring' },
      { key: 'progress', label: 'Progress Siswa', icon: 'trending_up', path: '/dashboard/guru/progress' },
    ],
    siswa: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/siswa' },
      { key: 'progress', label: 'Progress', icon: 'trending_up', path: '/dashboard/siswa/progress' },
      { key: 'assignments', label: 'Tugas', icon: 'assignment', path: '/dashboard/siswa/assignments' },
      { key: 'materials', label: 'Materi', icon: 'card_membership', path: '/dashboard/siswa/materials' },
      { key: 'schedule', label: 'Jadwal', icon: 'calendar_month', path: '/dashboard/siswa/schedule' },
    ],
    ortu: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard/ortu' },
      { key: 'children', label: 'Anak Saya', icon: 'family_restroom', path: '/dashboard/ortu/children' },
      { key: 'progress', label: 'Progress Anak', icon: 'trending_up', path: '/dashboard/ortu/progress' },
      { key: 'reports', label: 'Laporan', icon: 'receipt', path: '/dashboard/ortu/reports' },
    ]
  };

  const currentMenus = menus[role] || menus.siswa;
  const roleNames = { admin: 'ADMINISTRATOR', guru: 'GURU', siswa: 'SISWA', ortu: 'ORANG TUA' };


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

  // Get display role
  const getDisplayRole = () => {
    return roleNames[role] || role?.toUpperCase() || 'User';
  };

  return (
    <>
      <aside className={`sidebar-modern ${isOpen ? 'open' : ''}`}>
        {/* Konten sidebar (user info, menu, footer) sama persis seperti sebelumnya */}
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