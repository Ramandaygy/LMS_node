import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { authService } from './services/auth';
import { pushNotificationService } from './services/pushNotificationService';

// ============================================
// STYLES
// ============================================
import './styles/global.css';
import './App.css';

// ============================================
// PUBLIC PAGES
// ============================================
import LandingPage from './pages/LandingPage';
import Tentang from './pages/Tentang';
import Kursus from './pages/Kursus';
import Kontak from './pages/Kontak';

// ============================================
// PROFILE
// ============================================
import Profile from './pages/profile/Profile';

// ============================================
// AUTH PAGES
// ============================================
import LoginSiswa from './pages/auth/LoginSiswa';
import LoginGuru from './pages/auth/LoginGuru';
import LoginOrtu from './pages/auth/LoginOrtu';
import LoginAdmin from './pages/auth/LoginAdmin';

import RegisterSiswa from './pages/auth/RegisterSiswa';
import RegisterGuru from './pages/auth/RegisterGuru';
import RegisterOrtu from './pages/auth/RegisterOrtu';
import RegisterAdmin from './pages/auth/RegisterAdmin';
import ForgotPassword from './pages/auth/ForgotPassword';

// ============================================
// DASHBOARD PAGES
// ============================================
import AdminDashboard from './pages/dashboard/AdminDashboard';
import GuruDashboard from './pages/dashboard/GuruDashboard';
import SiswaDashboard from './pages/dashboard/SiswaDashboard';
import OrtuDashboard from './pages/dashboard/OrtuDashboard';
import BkDashboard from './pages/dashboard/bk/BkDashboard';

// ============================================
// ADMIN SUB PAGES
// ============================================
import AdminStudents from './pages/dashboard/admin/AdminStudents';
import AdminTeachers from './pages/dashboard/admin/AdminTeachers';
import AdminParents from './pages/dashboard/admin/AdminParents';
import AdminReports from './pages/dashboard/admin/AdminReports';
import AdminClasses from './pages/dashboard/admin/AdminClasses';
import AdminSubjects from './pages/dashboard/admin/AdminMapel';
import AdminAcademicYear from './pages/dashboard/admin/AdminAcademic';
import AdminSchedule from './pages/dashboard/admin/AdminSchedule';
import AdminMonitoring from './pages/dashboard/admin/AdminMonitoring';
import AdminStudentDetail from './pages/dashboard/admin/AdminStudentDetail';
import AdminSettings from './pages/dashboard/admin/AdminSettings';
import SuperAdminAccounts from './pages/dashboard/admin/SuperAdminAccounts';
import SuperAdminRoles from './pages/dashboard/admin/SuperAdminRoles';
import SuperAdminSettings from './pages/dashboard/admin/SuperAdminSettings';
import SuperAdminActivityLogs from './pages/dashboard/admin/SuperAdminActivityLogs';
import SuperAdminBackup from './pages/dashboard/admin/SuperAdminBackup';


// ============================================
// SHARED SUB PAGES
// ============================================
import CalendarInfo from './pages/dashboard/shared/CalendarInfo';

// ============================================
// GURU SUB PAGES
// ============================================
import GuruCourses from './pages/dashboard/guru/GuruCourses';
import GuruAssignments from './pages/dashboard/guru/GuruAssignments';
import GuruMaterials from './pages/dashboard/guru/GuruMaterials';
import GuruAttendance from './pages/dashboard/guru/GuruAttendance';
import GuruMonitoring from './pages/dashboard/guru/GuruMonitoring';
import GuruStudents from './pages/dashboard/guru/GuruStudents';
import GuruProgress from './pages/dashboard/guru/GuruProgress';
import GuruQuiz from './pages/dashboard/guru/GuruQuiz';
import GuruCbt from './pages/dashboard/guru/GuruCbt';
import GuruInputNilai from './pages/dashboard/guru/GuruInputNilai';
import GuruWaliKelas from './pages/dashboard/guru/GuruWaliKelas';

// ============================================
// SISWA SUB PAGES
// ============================================
import SiswaAssignments from './pages/dashboard/siswa/SiswaAssignments';
import SiswaAttendance from './pages/dashboard/siswa/SiswaAttendance';
import SiswaMaterials from './pages/dashboard/siswa/SiswaMaterials';
import SiswaProgress from './pages/dashboard/siswa/SiswaProgress';
import SiswaSchedule from './pages/dashboard/siswa/SiswaSchedule';
import SiswaCbt from './pages/dashboard/siswa/SiswaCbt';
import SiswaQuiz from './pages/dashboard/siswa/SiswaQuiz';

// ============================================
// ORTU SUB PAGES
// ============================================
import OrtuAttendance from './pages/dashboard/ortu/OrtuAttendance';
import OrtuMonitoring from './pages/dashboard/ortu/OrtuMonitoring';
import OrtuChildren from './pages/dashboard/ortu/OrtuChildren';
import OrtuReports from './pages/dashboard/ortu/OrtuReports';
import OrtuSchedule from './pages/dashboard/ortu/OrtuSchedule';

// ============================================
// COMPONENTS
// ============================================
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// ============================================
// PROTECTED ROUTE
// ============================================
const ProtectedRoute = ({ children, allowedRole }) => {
  const currentUser = authService.getCurrentUser();

  console.log(' ProtectedRoute User:', currentUser);

  // Belum login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Token hilang
  if (!authService.getToken()) {
    authService.logout();
    return <Navigate to="/login" replace />;
  }

  // Role tidak sesuai
  const isAllowed = Array.isArray(allowedRole)
    ? allowedRole.includes(currentUser.role)
    : currentUser.role === allowedRole;

  if (allowedRole && !isAllowed) {
    return (
      <Navigate
        to={`/dashboard/${currentUser.role}`}
        replace
      />
    );
  }

  // Valid
  return children;
};

// ============================================
// REDIRECT DASHBOARD
// ============================================
const DashboardRedirect = () => {
  const currentUser = authService.getCurrentUser();

  if (currentUser && currentUser.role) {
    return (
      <Navigate
        to={`/dashboard/${currentUser.role}`}
        replace
      />
    );
  }

  return <Navigate to="/login" replace />;
};

function App() {

  // ============================================
  // STATE
  // ============================================
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // ============================================
  // USER
  // ============================================
  const currentUser = authService.getCurrentUser();

  // ============================================
  // DEBUG
  // ============================================
  useEffect(() => {
    console.log(' App Current User:', currentUser);
  }, [currentUser]);

  // ============================================
  // LOGOUT
  // ============================================
  const handleLogout = () => {
    authService.logout();

    // Hard refresh supaya state reset total
    window.location.href = '/login';
  };

  // ============================================
  // DASHBOARD LAYOUT
  // ============================================
  // App.jsx
  const DashboardLayout = ({ children, role }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // Initialize Push Notifications
    useEffect(() => {
      pushNotificationService.subscribe();
    }, []);

    return (
      <div className="dashboard-container">
        {/* Tombol hamburger - hanya tampil di mobile (CSS atur display) */}
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <span className="material-symbols-outlined">menu</span>
        </button>
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}
        <Sidebar
          role={role}
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="main-content">
          {children}
        </div>
      </div>
    );
  };

  // ============================================
  // PUBLIC LAYOUT
  // ============================================
  const PublicLayout = ({ children }) => {
    return (
      <>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
        />

        {children}
      </>
    );
  };

  // ============================================
  // AUTH LAYOUT
  // ============================================
  const AuthLayout = ({ children }) => {
    return <>{children}</>;
  };

  // ============================================
  // ROUTES
  // ============================================
  return (
    <Router>
      <Routes>

        {/* ============================================ */}
        {/* PUBLIC ROUTES */}
        {/* ============================================ */}

        <Route
          path="/"
          element={
            currentUser ? (
              <DashboardRedirect />
            ) : (
              <PublicLayout>
                <LandingPage />
              </PublicLayout>
            )
          }
        />

        <Route
          path="/tentang"
          element={
            <PublicLayout>
              <Tentang />
            </PublicLayout>
          }
        />

        <Route
          path="/kursus"
          element={
            <PublicLayout>
              <Kursus />
            </PublicLayout>
          }
        />

        <Route
          path="/kontak"
          element={
            <PublicLayout>
              <Kontak />
            </PublicLayout>
          }
        />

        {/* ============================================ */}
        {/* LOGIN ROUTES */}
        {/* ============================================ */}

        <Route
          path="/login/siswa"
          element={
            <AuthLayout>
              <LoginSiswa />
            </AuthLayout>
          }
        />

        <Route
          path="/login/guru"
          element={
            <AuthLayout>
              <LoginGuru />
            </AuthLayout>
          }
        />

        <Route
          path="/login/ortu"
          element={
            <AuthLayout>
              <LoginOrtu />
            </AuthLayout>
          }
        />

        <Route
          path="/login/admin"
          element={
            <AuthLayout>
              <LoginAdmin />
            </AuthLayout>
          }
        />

        <Route
          path="/login"
          element={<Navigate to={`/login/${localStorage.getItem('lastRole') || 'siswa'}`} replace />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* ============================================ */}
        {/* REGISTER ROUTES - REDIRECTED TO LOGIN (CLOSED SYSTEM) */}
        {/* ============================================ */}
        <Route path="/register/*" element={<Navigate to="/login" replace />} />



        {/* ============================================ */}
        {/* SISWA DASHBOARD */}
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

        <Route
          path="/dashboard/siswa/attendance" element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          } />

        <Route
          path="/dashboard/siswa/materials"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaMaterials />
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
          path="/dashboard/siswa/schedule"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaSchedule />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/cbt"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaCbt />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/quiz"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaQuiz />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/calendar"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* GURU DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/guru"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/courses"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruCourses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/walikelas"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruWaliKelas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/assignments"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/materials"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruMaterials />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/attendance"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/input-nilai"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruInputNilai />
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
          path="/dashboard/guru/progress"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruProgress />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/students"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruStudents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/quiz"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruQuiz />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/cbt"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <GuruCbt />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/calendar"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="guru">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* BK DASHBOARD */}
        {/* ============================================ */}
        <Route
          path="/dashboard/bk"
          element={
            <ProtectedRoute allowedRole="bk">
              <DashboardLayout role="bk">
                <BkDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* ADMIN DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
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
          path="/dashboard/admin/reports"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/classes"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminClasses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/subjects"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminSubjects />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/academic-year"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminAcademicYear />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/schedule"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminSchedule />
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
          path="/dashboard/admin/parents"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminParents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/settings"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/accounts"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminAccounts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/roles"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminRoles />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/settings"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/activity-logs"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminActivityLogs />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/backup"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminBackup />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/students/:studentId"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminStudentDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/monitoring"
          element={
            <ProtectedRoute allowedRole={['admin', 'guru']}>
              <DashboardLayout role="admin">
                <AdminMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/leger"
          element={
            <ProtectedRoute allowedRole={['admin', 'guru']}>
              <DashboardLayout role="guru">
                <AdminMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/parents"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminParents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/calendar"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* ORTU DASHBOARD */}
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
        <Route
          path="/dashboard/ortu/attendance" element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          } />

        <Route path="/dashboard/ortu/monitoring" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuMonitoring />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/children" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuChildren />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/reports" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuReports />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/schedule" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuSchedule />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/calendar" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <CalendarInfo />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ============================================ */}
        {/* PROFILE */}
        {/* ============================================ */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout role={currentUser?.role}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* DASHBOARD REDIRECT */}
        {/* ============================================ */}

        <Route
          path="/dashboard"
          element={<DashboardRedirect />}
        />

        {/* ============================================ */}
        {/* NOT FOUND */}
        {/* ============================================ */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Router>
  );
}

export default App;