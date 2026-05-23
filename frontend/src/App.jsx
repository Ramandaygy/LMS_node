import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authService } from './services/auth';

// Import styles
import './styles/global.css';
import './App.css';

// Import pages - Public
import LandingPage from './pages/LandingPage';

// Import profile
import Profile from './pages/profile/Profile';

// Import login pages (per role)
import LoginSiswa from './pages/auth/LoginSiswa';
import LoginGuru from './pages/auth/LoginGuru';
import LoginOrtu from './pages/auth/LoginOrtu';
import LoginAdmin from './pages/auth/LoginAdmin';

// Import register pages (per role)
import RegisterSiswa from './pages/auth/RegisterSiswa';
import RegisterGuru from './pages/auth/RegisterGuru';
import RegisterOrtu from './pages/auth/RegisterOrtu';
import RegisterAdmin from './pages/auth/RegisterAdmin';

// Import dashboard pages (per role)
import AdminDashboard from './pages/dashboard/AdminDashboard';
import GuruDashboard from './pages/dashboard/GuruDashboard';
import SiswaDashboard from './pages/dashboard/SiswaDashboard';
import OrtuDashboard from './pages/dashboard/OrtuDashboard';

// ============================================
// SUB PAGES
// ============================================
// Admin sub pages
import AdminStudents from './pages/dashboard/admin/AdminStudents';
import AdminTeachers from './pages/dashboard/admin/AdminTeachers';
import AdminCourses from './pages/dashboard/admin/AdminCourses';
import AdminReports from './pages/dashboard/admin/AdminReports';
import AdminClasses from './pages/dashboard/admin/AdminClasses';
import AdminSubjects from './pages/dashboard/admin/AdminMapel';
import AdminAcademicYear from './pages/dashboard/admin/AdminAcademic';
import AdminSchedule from './pages/dashboard/admin/AdminSchedule';
import AdminDataMaster from './pages/dashboard/admin/AdminDataMaster';

// Guru sub pages
import GuruCourses from './pages/dashboard/guru/GuruCourses';
import GuruAssignments from './pages/dashboard/guru/GuruAssignments';
import GuruMaterials from './pages/dashboard/guru/GuruMaterials';
import GuruAttendance from './pages/dashboard/guru/GuruAttendance';
import GuruMonitoring from './pages/dashboard/guru/GuruMonitoring';
import GuruStudents from './pages/dashboard/guru/GuruStudents';

// Siswa sub pages (comment dulu sampai file dibuat)
// import SiswaCourses from './pages/dashboard/siswa/SiswaCourses';
// import SiswaProgress from './pages/dashboard/siswa/SiswaProgress';
 import SiswaAssignments from './pages/dashboard/siswa/SiswaAssignments';
// import SiswaCertificates from './pages/dashboard/siswa/SiswaCertificates';
// import SiswaSchedule from './pages/dashboard/siswa/SiswaSchedule';

// Ortu sub pages (comment dulu sampai file dibuat)
// import OrtuChildren from './pages/dashboard/ortu/OrtuChildren';
// import OrtuProgress from './pages/dashboard/ortu/OrtuProgress';
// import OrtuReports from './pages/dashboard/ortu/OrtuReports';

// Import additional pages
import Tentang from './pages/Tentang';
import Kursus from './pages/Kursus';
import Kontak from './pages/Kontak';

// Import components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

   useEffect(() => {
    const currentUser = authService.getCurrentUser();
    console.log('🔐 ProtectedRoute - Checking user:', currentUser);

    if (!currentUser) {
      console.log('🔐 No user, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
      console.log(`🔐 Role mismatch: ${currentUser.role} vs ${allowedRole}`);
      
      //  PENTING: stop loading dulu sebelum redirect
      setLoading(false);

      navigate(`/dashboard/${currentUser.role}`, { replace: true });
      return;
    }

    // kalau valid
    setLoading(false);

  }, [navigate, allowedRole]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      console.log(' App init - Current user:', currentUser);
      if (currentUser && currentUser.role) {
        setUser(currentUser);
        console.log(' User set, role:', currentUser.role);
      } else {
        console.log(' No user found');
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    console.log(' User logged out');
  };

  // Layout untuk dashboard (dengan sidebar) - TANPA NAVBAR
  const DashboardLayout = ({ children, role }) => {
    return (
      <div className="dashboard-container">
        <Sidebar role={role} activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <div className="main-content">
          {children}
        </div>
      </div>
    );
  };

  // Layout untuk public pages (DENGAN navbar) - LandingPage, Tentang, Kursus, Kontak
  const PublicLayout = ({ children }) => {
    return (
      <>
        <Navbar user={user} onLogout={handleLogout} />
        {children}
      </>
    );
  };

  // Layout untuk auth pages (TANPA navbar) - Login & Register
  const AuthLayout = ({ children }) => {
    return (
      <>
        {children}
      </>
    );
  };

  const getDashboardComponent = (role) => {
    switch (role) {
      case 'admin':
        return <AdminDashboard />;
      case 'guru':
        return <GuruDashboard />;
      case 'siswa':
        return <SiswaDashboard />;
      case 'ortu':
        return <OrtuDashboard />;
      default:
        return <SiswaDashboard />;
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* ============================================ */}
        {/* PUBLIC ROUTES - dengan Navbar */}
        {/* ============================================ */}
        <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path="/tentang" element={<PublicLayout><Tentang /></PublicLayout>} />
        <Route path="/kursus" element={<PublicLayout><Kursus /></PublicLayout>} />
        <Route path="/kontak" element={<PublicLayout><Kontak /></PublicLayout>} />

        {/* ============================================ */}
        {/* AUTH ROUTES - TANPA Navbar (Login per Role) */}
        {/* ============================================ */}
        <Route path="/login/siswa" element={<AuthLayout><LoginSiswa /></AuthLayout>} />
        <Route path="/login/guru" element={<AuthLayout><LoginGuru /></AuthLayout>} />
        <Route path="/login/ortu" element={<AuthLayout><LoginOrtu /></AuthLayout>} />
        <Route path="/login/admin" element={<AuthLayout><LoginAdmin /></AuthLayout>} />
        <Route path="/login" element={<Navigate to="/login/siswa" replace />} />

        {/* ============================================ */}
        {/* REGISTER ROUTES - TANPA Navbar */}
        {/* ============================================ */}
        <Route path="/register/siswa" element={<AuthLayout><RegisterSiswa /></AuthLayout>} />
        <Route path="/register/guru" element={<AuthLayout><RegisterGuru /></AuthLayout>} />
        <Route path="/register/ortu" element={<AuthLayout><RegisterOrtu /></AuthLayout>} />
        <Route path="/register/admin" element={<AuthLayout><RegisterAdmin /></AuthLayout>} />
        <Route path="/register" element={<Navigate to="/register/siswa" replace />} />

        {/* ============================================ */}
        {/* DASHBOARD ROUTES - Siswa */}
        {/* ============================================ */}
        <Route 
          path="/dashboard/siswa" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Siswa Sub Pages - Aktifkan jika file sudah dibuat */}
        {/*
        <Route 
          path="/dashboard/siswa/courses" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaCourses />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/siswa/progress" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaProgress />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/siswa/certificates" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaCertificates />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/siswa/schedule" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaSchedule />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        */}
        <Route 
          path="/dashboard/siswa/assignments" 
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* ============================================ */}
        {/* DASHBOARD ROUTES - Guru */}
        {/* ============================================ */}
        <Route 
          path="/dashboard/guru" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/guru/courses" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruCourses />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/guru/attendance" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/guru/monitoring" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
      
        <Route 
          path="/dashboard/guru/students" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruStudents />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
      
        <Route 
          path="/dashboard/guru/assignments" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/dashboard/guru/materials" 
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruMaterials />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
      

        {/* ============================================ */}
        {/* DASHBOARD ROUTES - Admin */}
        {/* ============================================ */}
        <Route 
          path="/dashboard/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/admin/students" 
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminStudents />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/admin/teachers" 
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminTeachers />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/admin/courses" 
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminCourses />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/admin/reports" 
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminReports />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="/dashboard/admin/classes" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
              <AdminClasses />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/admin/subjects" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
              <AdminSubjects />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/admin/academic-year" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
              <AdminAcademicYear />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/admin/schedule" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
              <AdminSchedule />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/admin/data-master" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
              <AdminDataMaster />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ============================================ */}
        {/* DASHBOARD ROUTES - Ortu */}
        {/* ============================================ */}
        <Route 
          path="/dashboard/ortu" 
          element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Ortu Sub Pages - Aktifkan jika file sudah dibuat */}
        {/*
        <Route 
          path="/dashboard/ortu/children" 
          element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuChildren />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/ortu/progress" 
          element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuProgress />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/ortu/reports" 
          element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuReports />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        */}

        {/* ============================================ */}
        {/* REDIRECTS */}
        {/* ============================================ */}
        <Route 
          path="/dashboard" 
          element={
            user && user.role ? (
              <Navigate to={`/dashboard/${user.role}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <DashboardLayout role={user?.role}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;